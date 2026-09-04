import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAPPINGS,
  gestureFromIntent,
  intentMatchesAction,
  nextClickGesture,
} from "./mapping";

describe("gesture mapping", () => {
  it("maps keyboard-style intents onto wizard gestures", () => {
    expect(
      gestureFromIntent({ type: "class_label", label: "confirm", confidence: 1, t: 1 })
    ).toBe("confirm");
    expect(
      gestureFromIntent({ type: "class_label", label: "key", confidence: 1, t: 1 })
    ).toBe("key");
    expect(
      gestureFromIntent({ type: "switch_binary", index: 0, active: true, t: 1 })
    ).toBe("switch");
    expect(gestureFromIntent({ type: "synthetic", name: "dwell", t: 1 })).toBe("dwell");
    expect(gestureFromIntent({ type: "velocity_2d", vx: 1, vy: 0, t: 1 })).toBeNull();
  });

  it("cycles click remap targets through wizard gestures", () => {
    expect(nextClickGesture("confirm")).toBe("switch");
    expect(nextClickGesture("switch")).toBe("key");
    expect(nextClickGesture("key")).toBe("dwell");
    expect(nextClickGesture("dwell")).toBe("confirm");
  });

  it("matches actions using profile mappings", () => {
    const remapped = { ...DEFAULT_MAPPINGS, click: "switch" as const };
    expect(
      intentMatchesAction(
        { type: "switch_binary", index: 2, active: true, t: 1 },
        "click",
        remapped
      )
    ).toBe(true);
    expect(
      intentMatchesAction(
        { type: "class_label", label: "confirm", confidence: 1, t: 1 },
        "click",
        remapped
      )
    ).toBe(false);
  });
});
