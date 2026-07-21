import { beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "./store";
import { DEFAULT_PROFILE } from "./profiles/schema";

describe("shell store panic + modes", () => {
  beforeEach(() => {
    useShellStore.setState({
      connection: "synthetic",
      mode: "point",
      safeMode: true,
      hold: false,
      frozen: false,
      confidence: 0.5,
      lastIntentAt: null,
      profile: { ...DEFAULT_PROFILE },
      cursor: { x: 0.5, y: 0.5 },
      clickTargetId: null,
      typed: "",
      switchIndex: 0,
      pendingMode: null,
      statusMessage: "test",
      undoStack: [],
      hydrated: true,
    });
  });

  it("STOP freezes and sets idle", () => {
    useShellStore.getState().panicStop();
    const s = useShellStore.getState();
    expect(s.mode).toBe("idle");
    expect(s.frozen).toBe(true);
    expect(s.pendingMode).toBeNull();
  });

  it("UNDO restores previous mode after STOP", () => {
    useShellStore.getState().panicStop();
    useShellStore.getState().undo();
    expect(useShellStore.getState().mode).toBe("point");
  });

  it("Safe mode requires confirm for mode change", () => {
    useShellStore.getState().requestMode("click");
    expect(useShellStore.getState().mode).toBe("point");
    expect(useShellStore.getState().pendingMode).toBe("click");
    useShellStore.getState().confirmPendingMode();
    expect(useShellStore.getState().mode).toBe("click");
    expect(useShellStore.getState().pendingMode).toBeNull();
  });

  it("HOLD blocks mode change", () => {
    useShellStore.getState().panicHold();
    useShellStore.getState().requestMode("type");
    expect(useShellStore.getState().mode).toBe("point");
    expect(useShellStore.getState().pendingMode).toBeNull();
  });

  it("velocity updates cursor in point mode", () => {
    useShellStore.getState().applyIntent({
      type: "velocity_2d",
      vx: 1,
      vy: 0,
      t: Date.now(),
    });
    expect(useShellStore.getState().cursor.x).toBeGreaterThan(0.5);
  });

  it("appendTyped supports undo", () => {
    useShellStore.getState().appendTyped("a");
    useShellStore.getState().appendTyped("b");
    expect(useShellStore.getState().typed).toBe("ab");
    useShellStore.getState().undo();
    expect(useShellStore.getState().typed).toBe("a");
  });
});
