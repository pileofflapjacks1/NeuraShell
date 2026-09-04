import type { IntentEvent } from "./types";
import { isGestureId, type GestureId } from "./types";

export type ActionMappings = {
  click: GestureId;
  confirm: GestureId;
  stop: GestureId;
};

export const DEFAULT_MAPPINGS: ActionMappings = {
  click: "confirm",
  confirm: "confirm",
  stop: "key",
};

export const GESTURE_HINTS: Record<GestureId, string> = {
  confirm: "Enter (confirm)",
  key: "K (key)",
  switch: "1–4 (switch)",
  dwell: "Hold cursor on target (dwell)",
};

const CLICK_CYCLE: GestureId[] = ["confirm", "switch", "key", "dwell"];

export function sanitizeMappings(raw: unknown): ActionMappings {
  const src =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    click: isGestureId(src.click) ? src.click : DEFAULT_MAPPINGS.click,
    confirm: isGestureId(src.confirm) ? src.confirm : DEFAULT_MAPPINGS.confirm,
    stop: isGestureId(src.stop) ? src.stop : DEFAULT_MAPPINGS.stop,
  };
}

/** Map a live intent onto a wizard/gym gesture id. Velocity is not a gesture. */
export function gestureFromIntent(event: IntentEvent): GestureId | null {
  if (event.type === "class_label") {
    if (event.label === "confirm" || event.label === "select" || event.label === "click") {
      return "confirm";
    }
    if (event.label === "key") return "key";
    if (event.label === "dwell") return "dwell";
    return null;
  }
  if (event.type === "switch_binary" && event.active) return "switch";
  if (event.type === "synthetic") {
    if (event.name === "dwell") return "dwell";
    if (event.name === "key") return "key";
    if (event.name === "stop") return "key";
  }
  return null;
}

export function intentMatchesAction(
  event: IntentEvent,
  action: keyof ActionMappings,
  mappings: ActionMappings
): boolean {
  const g = gestureFromIntent(event);
  return g !== null && g === mappings[action];
}

export function nextClickGesture(current: GestureId): GestureId {
  const i = CLICK_CYCLE.indexOf(current);
  const idx = i < 0 ? 0 : (i + 1) % CLICK_CYCLE.length;
  return CLICK_CYCLE[idx]!;
}

export function classLabelConfidence(event: IntentEvent): number | null {
  return event.type === "class_label" ? event.confidence : event.type === "switch_binary" ? 0.9 : 1;
}
