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
      freezeReason: null,
      frozenAt: null,
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
      calibrating: false,
    });
  });

  it("STOP freezes and sets idle with freezeReason stop", () => {
    useShellStore.getState().panicStop();
    const s = useShellStore.getState();
    expect(s.mode).toBe("idle");
    expect(s.frozen).toBe(true);
    expect(s.freezeReason).toBe("stop");
    expect(s.frozenAt).toBeTypeOf("number");
    expect(s.pendingMode).toBeNull();
  });

  it("HOLD sets freezeReason hold without changing mode", () => {
    useShellStore.getState().panicHold();
    const s = useShellStore.getState();
    expect(s.hold).toBe(true);
    expect(s.mode).toBe("point");
    expect(s.freezeReason).toBe("hold");
  });

  it("RELEASE clears freeze state", () => {
    useShellStore.getState().panicStop();
    useShellStore.getState().releaseHold();
    const s = useShellStore.getState();
    expect(s.frozen).toBe(false);
    expect(s.hold).toBe(false);
    expect(s.freezeReason).toBeNull();
    expect(s.frozenAt).toBeNull();
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

  it("completeCalibration stamps calibratedAt and profile fields", () => {
    useShellStore.getState().completeCalibration({
      dwellMs: 800,
      confidenceThreshold: 0.7,
      safeMode: true,
    });
    const p = useShellStore.getState().profile;
    expect(p.dwellMs).toBe(800);
    expect(p.confidenceThreshold).toBe(0.7);
    expect(p.calibratedAt).toBeTruthy();
    expect(p.version).toBe("0.2.0");
  });
});
