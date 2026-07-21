import type { IntentAdapter, IntentHandler } from "./types";

/**
 * Synthetic intent stream: random-walk velocity + occasional discrete events.
 * Zero hardware required.
 */
export function createSyntheticAdapter(options?: {
  intervalMs?: number;
  seed?: number;
}): IntentAdapter {
  const intervalMs = options?.intervalMs ?? 50;
  let timer: ReturnType<typeof setInterval> | null = null;
  let vx = 0;
  let vy = 0;
  let tick = 0;
  let handler: IntentHandler | null = null;

  return {
    id: "synthetic",
    start(onIntent) {
      handler = onIntent;
      tick = 0;
      vx = 0;
      vy = 0;
      onIntent({ type: "synthetic", name: "session_start", t: Date.now() });

      timer = setInterval(() => {
        if (!handler) return;
        tick += 1;
        // Smooth random walk (clamped)
        vx = Math.max(-1, Math.min(1, vx + (Math.random() - 0.5) * 0.15));
        vy = Math.max(-1, Math.min(1, vy + (Math.random() - 0.5) * 0.15));
        const t = Date.now();
        handler({ type: "velocity_2d", vx, vy, t });

        // Periodic discrete events for click / switch demos
        if (tick % 40 === 0) {
          const conf = 0.55 + Math.random() * 0.4;
          handler({
            type: "class_label",
            label: "confirm",
            confidence: conf,
            t,
          });
        }
        if (tick % 55 === 0) {
          const index = Math.floor(Math.random() * 4);
          handler({ type: "switch_binary", index, active: true, t });
        }
      }, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (handler) {
        handler({ type: "synthetic", name: "session_stop", t: Date.now() });
      }
      handler = null;
    },
  };
}
