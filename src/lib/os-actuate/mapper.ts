import type { GestureId, IntentEvent } from "@/lib/intents/types";
import {
  DEFAULT_MAPPINGS,
  gestureFromIntent,
  type ActionMappings,
} from "@/lib/intents/mapping";
import type { OsSample } from "./types";

export type OsMapOpts = {
  clickThreshold?: number;
  mappings?: ActionMappings;
};

/**
 * Map shell intent vocabulary → Intent→OS sample.
 * Click emission follows profile.mappings.click (gym remap).
 * Returns null for events that should not drive OS (e.g. synthetic noise).
 */
export function intentToOsSample(
  event: IntentEvent,
  opts?: OsMapOpts
): OsSample | null {
  const clickThreshold = opts?.clickThreshold ?? 0.65;
  const mappings = opts?.mappings ?? DEFAULT_MAPPINGS;
  const tSec = event.t > 1e12 ? event.t / 1000 : event.t;

  if (event.type === "velocity_2d") {
    return {
      vx: clamp(event.vx, -1, 1),
      vy: clamp(event.vy, -1, 1),
      click: 0,
      t: tSec,
    };
  }

  const via = gestureFromIntent(event);
  if (via && via === mappings.click) {
    const strength = clickStrength(event, clickThreshold);
    return { vx: 0, vy: 0, click: strength, t: tSec };
  }

  return null;
}

function clickStrength(event: IntentEvent, clickThreshold: number): number {
  if (event.type === "class_label") {
    return event.confidence >= clickThreshold ? event.confidence : 0;
  }
  if (event.type === "switch_binary" && event.active) return 0.9;
  if (event.type === "synthetic") return 0.9;
  return 0;
}

export function mappingGestureForSample(
  event: IntentEvent,
  mappings: ActionMappings = DEFAULT_MAPPINGS
): GestureId | null {
  const via = gestureFromIntent(event);
  if (via && via === mappings.click) return via;
  return null;
}

export function formatOsPreview(
  sample: OsSample,
  mode: "dry-run" | "live",
  posted?: boolean,
  via?: GestureId | null,
  clickMapsTo?: GestureId
): { kind: "move" | "click" | "post"; text: string } {
  const moving = Math.hypot(sample.vx, sample.vy) > 0.02;
  const viaBit = via ? ` via ${via}` : "";
  const mapBit = clickMapsTo ? ` (click←${clickMapsTo})` : "";
  if (sample.click >= 0.85) {
    return {
      kind: posted ? "post" : "click",
      text: `${mode === "live" && posted ? "LIVE " : ""}CLICK${viaBit}${mapBit} click=${sample.click.toFixed(2)}`,
    };
  }
  if (moving) {
    return {
      kind: posted ? "post" : "move",
      text: `${mode === "live" && posted ? "LIVE " : ""}move vx=${sample.vx.toFixed(2)} vy=${sample.vy.toFixed(2)}${mapBit}`,
    };
  }
  return {
    kind: "move",
    text: `${mode} idle vx=${sample.vx.toFixed(2)} vy=${sample.vy.toFixed(2)}${mapBit}`,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
