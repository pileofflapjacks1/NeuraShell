import type { IntentAdapter, IntentHandler } from "./types";

const VELOCITY_KEYS = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

/** Text entry: every key belongs to the field. */
function isTextEntryTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  const tag = el?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(el?.isContentEditable);
}

/**
 * Controls that Enter / Space activate natively. The adapter must not cancel
 * that activation or stack a confirm intent on top of it.
 */
function isActivatableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  return Boolean(
    el.closest('button, a[href], summary, [role="button"], [role="link"], [role="menuitem"]')
  );
}

/**
 * Keyboard sim adapter:
 * - Arrows / WASD → velocity_2d
 * - Enter → class_label confirm
 * - Esc → synthetic stop (host maps to STOP)
 * - 1–4 → switch_binary
 * - K → class_label key (gym / remap)
 * - Space → confirm (host may also use for Safe mode confirm)
 *
 * Browser shortcuts (⌘ / Ctrl / Alt chords) pass through untouched. Enter and
 * Space on a focused button or link activate that control instead of
 * confirming. Held keys are dropped when the window loses focus so velocity
 * cannot stick.
 */
export function createKeyboardAdapter(): IntentAdapter {
  let handler: IntentHandler | null = null;
  let pressed = new Set<string>();
  let raf: number | null = null;

  const onKeyDown = (e: KeyboardEvent) => {
    if (!handler) return;
    const key = e.key.toLowerCase();
    const t = Date.now();

    // Don't steal typing from inputs
    if (isTextEntryTarget(e.target)) return;

    // Esc is STOP from anywhere outside a text field, chord or not.
    if (key === "escape") {
      e.preventDefault();
      if (!e.repeat) handler({ type: "synthetic", name: "stop", t });
      return;
    }

    // Leave ⌘A / Ctrl+S / Alt+← and friends to the browser.
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (VELOCITY_KEYS.includes(key)) {
      e.preventDefault();
      pressed.add(key);
      return;
    }

    if (key === "enter" || key === " " || key === "spacebar") {
      // Native activation wins on buttons and links.
      if (isActivatableTarget(e.target)) return;
      if (key === "enter") e.preventDefault();
      // Host uses Space for Safe confirm; still emit intent
      if (!e.repeat) handler({ type: "class_label", label: "confirm", confidence: 1, t });
      return;
    }

    if (key === "k") {
      e.preventDefault();
      if (!e.repeat) handler({ type: "class_label", label: "key", confidence: 1, t });
      return;
    }

    if (["1", "2", "3", "4"].includes(key)) {
      e.preventDefault();
      if (e.repeat) return;
      handler({
        type: "switch_binary",
        index: Number(key) - 1,
        active: true,
        t,
      });
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    pressed.delete(key);
    // Releasing a modifier can swallow the keyup of the key held with it.
    if (key === "meta" || key === "control" || key === "alt") pressed.clear();
  };

  // No keyup arrives once focus leaves the window, so drop held keys.
  const releaseAll = () => {
    pressed.clear();
  };
  const onVisibility = () => {
    if (document.hidden) releaseAll();
  };

  const emitVelocity = () => {
    if (!handler) {
      raf = requestAnimationFrame(emitVelocity);
      return;
    }
    let vx = 0;
    let vy = 0;
    if (pressed.has("arrowleft") || pressed.has("a")) vx -= 1;
    if (pressed.has("arrowright") || pressed.has("d")) vx += 1;
    if (pressed.has("arrowup") || pressed.has("w")) vy -= 1;
    if (pressed.has("arrowdown") || pressed.has("s")) vy += 1;
    if (vx !== 0 || vy !== 0) {
      // Normalize diagonal
      const mag = Math.hypot(vx, vy) || 1;
      handler({
        type: "velocity_2d",
        vx: vx / mag,
        vy: vy / mag,
        t: Date.now(),
      });
    }
    raf = requestAnimationFrame(emitVelocity);
  };

  return {
    id: "keyboard",
    start(onIntent) {
      handler = onIntent;
      pressed = new Set();
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", releaseAll);
      if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", onVisibility);
      }
      raf = requestAnimationFrame(emitVelocity);
    },
    stop() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      handler = null;
      pressed.clear();
    },
  };
}
