import { describe, expect, it } from "vitest";
import {
  undoActionLabel,
  undoTimeline,
  withUndoTimestamps,
  type UndoAction,
} from "./undo-timeline";

describe("undo timeline", () => {
  it("lists the newest entry first", () => {
    const rows = undoTimeline([
      { kind: "mode", from: "point", to: "click", at: 1_000 },
      { kind: "type_char", char: "a", at: 2_000 },
    ]);
    expect(rows.map((row) => row.label)).toEqual([
      "Typed “a”",
      "Switched mode from point to click",
    ]);
    expect(rows[0]?.newest).toBe(true);
    expect(rows[1]?.newest).toBe(false);
    expect(rows[0]?.stackIndex).toBe(1);
    expect(rows[1]?.stackIndex).toBe(0);
  });

  it("adds a timestamp when an entry does not have one", () => {
    const bare: UndoAction = { kind: "safe_mode", from: true, to: false };
    const now = 1_700_000_000_000;
    const [row] = undoTimeline([bare], now);
    expect(row?.at).toBe(now);
    expect(bare.at).toBeUndefined();

    const stamped = withUndoTimestamps([bare], now);
    expect(stamped[0]?.at).toBe(now);
    expect(withUndoTimestamps(stamped, now + 50)).toBe(stamped);
  });

  it("labels each stack kind in plain language", () => {
    expect(undoActionLabel({ kind: "mode", from: "idle", to: "type" })).toBe(
      "Switched mode from idle to type"
    );
    expect(undoActionLabel({ kind: "type_char", char: " " })).toBe("Typed “ ”");
    expect(
      undoActionLabel({ kind: "click_target", targetId: "target-TL", prevId: null })
    ).toBe("Selected target-TL");
    expect(undoActionLabel({ kind: "click_target", targetId: null, prevId: "target-TL" })).toBe(
      "Cleared the click target"
    );
    expect(undoActionLabel({ kind: "safe_mode", from: false, to: true })).toBe(
      "Turned safe mode on"
    );
    expect(undoActionLabel({ kind: "safe_mode", from: true, to: false })).toBe(
      "Turned safe mode off"
    );
  });
});
