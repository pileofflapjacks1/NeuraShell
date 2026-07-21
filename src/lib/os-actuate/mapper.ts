import type { IntentEvent } from "@/lib/intents/types";
import type { OsSample } from "./types";

/**
 * Map shell intent vocabulary → Intent→OS sample.
 * Returns null for events that should not drive OS (e.g. synthetic noise).
 */
export function intentToOsSample(
  event: IntentEvent,
  opts?: { clickThreshold?: number }
): OsSample | null {
  const clickThreshold = opts?.clickThreshold ?? 0.65;
  const tSec = event.t > 1e12 ? event.t / 1000 : event.t;

  if (event.type === "velocity_2d") {
    return {
      vx: clamp(event.vx, -1, 1),
      vy: clamp(event.vy, -1, 1),
      click: 0,
      t: tSec,
    };
  }

  if (event.type === "class_label") {
    const isConfirm =
      event.label === "confirm" ||
      event.label === "select" ||
      event.label === "click";
    if (!isConfirm) return null;
    const click = event.confidence >= clickThreshold ? event.confidence : 0;
    return { vx: 0, vy: 0, click, t: tSec };
  }

  if (event.type === "switch_binary" && event.active) {
    // Discrete switch → soft click pulse when active (optional path)
    return { vx: 0, vy: 0, click: 0.5, t: tSec };
  }

  return null;
}

export function formatOsPreview(
  sample: OsSample,
  mode: "dry-run" | "live",
  posted?: boolean
): { kind: "move" | "click" | "post"; text: string } {
  const moving = Math.hypot(sample.vx, sample.vy) > 0.02;
  if (sample.click >= 0.85) {
    return {
      kind: posted ? "post" : "click",
      text: `${mode === "live" && posted ? "LIVE " : ""}CLICK click=${sample.click.toFixed(2)}`,
    };
  }
  if (moving) {
    return {
      kind: posted ? "post" : "move",
      text: `${mode === "live" && posted ? "LIVE " : ""}move vx=${sample.vx.toFixed(2)} vy=${sample.vy.toFixed(2)}`,
    };
  }
  return {
    kind: "move",
    text: `${mode} idle vx=${sample.vx.toFixed(2)} vy=${sample.vy.toFixed(2)}`,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
