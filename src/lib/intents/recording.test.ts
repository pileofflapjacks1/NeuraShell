import { describe, expect, it } from "vitest";
import {
  buildRecording,
  importRecordingJson,
  exportRecordingJson,
  toRelativeEvents,
} from "./recording";
import type { IntentEvent } from "./types";

describe("intent recording", () => {
  const base: IntentEvent[] = [
    { type: "velocity_2d", vx: 0.5, vy: 0, t: 1000 },
    { type: "class_label", label: "confirm", confidence: 0.9, t: 1200 },
  ];

  it("converts to relative timestamps", () => {
    const rel = toRelativeEvents(base, 1000);
    expect(rel[0].t).toBe(0);
    expect(rel[1].t).toBe(200);
  });

  it("round-trips export/import", () => {
    const rec = buildRecording(base, 1000, "demo");
    const back = importRecordingJson(exportRecordingJson(rec));
    expect(back.name).toBe("demo");
    expect(back.events).toHaveLength(2);
    expect(back.events[0].type).toBe("velocity_2d");
    expect(back.events[0].t).toBe(0);
  });
});
