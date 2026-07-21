import type { IntentAdapter, IntentHandler } from "./types";

/**
 * Keyboard sim adapter:
 * - Arrows / WASD → velocity_2d
 * - Enter → class_label confirm
 * - Esc → synthetic stop (host maps to STOP)
 * - 1–4 → switch_binary
 * - Space → confirm (host may also use for Safe mode confirm)
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
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
      e.preventDefault();
      pressed.add(key);
      return;
    }

    if (key === "enter") {
      e.preventDefault();
      handler({ type: "class_label", label: "confirm", confidence: 1, t });
      return;
    }

    if (key === " " || key === "spacebar") {
      // Host uses Space for Safe confirm; still emit intent
      handler({ type: "class_label", label: "confirm", confidence: 1, t });
      return;
    }

    if (key === "escape") {
      e.preventDefault();
      handler({ type: "synthetic", name: "stop", t });
      return;
    }

    if (["1", "2", "3", "4"].includes(key)) {
      e.preventDefault();
      handler({
        type: "switch_binary",
        index: Number(key) - 1,
        active: true,
        t,
      });
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(e.key.toLowerCase());
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
      raf = requestAnimationFrame(emitVelocity);
    },
    stop() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
      handler = null;
      pressed.clear();
    },
  };
}
