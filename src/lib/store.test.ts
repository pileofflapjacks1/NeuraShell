import { beforeEach, describe, expect, it } from "vitest";
import { useShellStore } from "./store";
import { DEFAULT_PROFILE, sanitizeProfile } from "./profiles/schema";
import { DEFAULT_MAPPINGS } from "./intents/mapping";

function gymProfile() {
  return sanitizeProfile({
    ...DEFAULT_PROFILE,
    calibratedAt: "2026-07-21T00:00:00.000Z",
    lastGymAt: Date.now(),
    lastGymMissRate: 0.1,
    mappings: { ...DEFAULT_MAPPINGS },
  });
}

function resetStore() {
  useShellStore.setState({
    connection: "synthetic",
    bridgeLastMessageAt: null,
    mode: "point",
    safeMode: true,
    hold: false,
    frozen: false,
    freezeReason: null,
    frozenAt: null,
    confidence: 0.5,
    confidenceSamples: [],
    lastIntentAt: Date.now(),
    lastIntent: null,
    profile: gymProfile(),
    cursor: { x: 0.5, y: 0.5 },
    clickTargetId: null,
    typed: "",
    switchIndex: 0,
    pendingMode: null,
    statusMessage: "test",
    undoStack: [],
    hydrated: true,
    calibrating: false,
    armed: false,
    recording: false,
    recordingStartedAt: null,
    recordedEvents: [],
    lastRecording: null,
    replaying: false,
    osMode: "off",
    osEndpoint: "http://127.0.0.1:8765/intent",
    osPreview: [],
    osLastSampleAt: null,
    osLiveOk: null,
    osPostCount: 0,
    osErrorCount: 0,
    driftNudge: false,
    driftBadSince: null,
  });
}

describe("shell store panic + modes", () => {
  beforeEach(() => {
    resetStore();
  });

  it("STOP freezes, disarms, and sets idle", () => {
    useShellStore.getState().arm();
    useShellStore.getState().panicStop();
    const s = useShellStore.getState();
    expect(s.mode).toBe("idle");
    expect(s.frozen).toBe(true);
    expect(s.freezeReason).toBe("stop");
    expect(s.armed).toBe(false);
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

  it("velocity does not move cursor when disarmed", () => {
    const x0 = useShellStore.getState().cursor.x;
    useShellStore.getState().applyIntent({
      type: "velocity_2d",
      vx: 1,
      vy: 0,
      t: Date.now(),
    });
    expect(useShellStore.getState().cursor.x).toBe(x0);
    expect(useShellStore.getState().confidence).toBeGreaterThan(0);
  });

  it("velocity updates cursor when armed", () => {
    useShellStore.getState().arm();
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
    expect(p.version).toBe("0.3.0");
  });

  it("uncalibrated profile cannot arm", () => {
    useShellStore.setState({
      profile: { ...DEFAULT_PROFILE },
      lastIntentAt: Date.now(),
    });
    expect(useShellStore.getState().arm()).toBe(false);
    expect(useShellStore.getState().armed).toBe(false);
    expect(useShellStore.getState().statusMessage).toMatch(/Cannot ARM/i);
  });

  it("completeGym persist remap so next ARM is allowed", () => {
    useShellStore.setState({ profile: { ...DEFAULT_PROFILE } });
    expect(useShellStore.getState().arm()).toBe(false);
    useShellStore.getState().completeGym({
      missRate: 0.4,
      remap: { from: "confirm", to: "switch", reason: "gym miss" },
    });
    const p = useShellStore.getState().profile;
    expect(p.mappings.click).toBe("switch");
    expect(p.gymRemap?.to).toBe("switch");
    expect(p.lastGymAt).toBeTruthy();
    // miss 0.4 > 0.35 still blocks ARM
    expect(useShellStore.getState().arm()).toBe(false);
    useShellStore.getState().completeGym({ missRate: 0.1 });
    expect(useShellStore.getState().arm()).toBe(true);
  });

  it("records intents and builds lastRecording on stop", () => {
    useShellStore.getState().startRecording();
    useShellStore.getState().applyIntent({
      type: "velocity_2d",
      vx: 0.2,
      vy: 0,
      t: Date.now(),
    });
    useShellStore.getState().applyIntent({
      type: "class_label",
      label: "confirm",
      confidence: 0.9,
      t: Date.now() + 10,
    });
    const rec = useShellStore.getState().stopRecording();
    expect(rec).toBeTruthy();
    expect(rec!.events.length).toBe(2);
    expect(useShellStore.getState().recording).toBe(false);
    expect(useShellStore.getState().lastRecording?.events.length).toBe(2);
  });

  it("cannot arm when disconnected", () => {
    useShellStore.setState({ connection: "disconnected" });
    expect(useShellStore.getState().arm()).toBe(false);
    expect(useShellStore.getState().armed).toBe(false);
  });

  it("cannot arm when frozen", () => {
    useShellStore.getState().panicStop();
    expect(useShellStore.getState().arm()).toBe(false);
  });

  it("dry-run OS previews velocity without live posts", () => {
    useShellStore.getState().setOsMode("dry-run");
    useShellStore.getState().applyIntent({
      type: "velocity_2d",
      vx: 0.8,
      vy: 0,
      t: Date.now(),
    });
    const s = useShellStore.getState();
    expect(s.osMode).toBe("dry-run");
    expect(s.osPreview.length).toBeGreaterThan(0);
    expect(s.osPostCount).toBe(0);
  });

  it("STOP drops live OS to dry-run", () => {
    useShellStore.getState().arm();
    useShellStore.setState({ osMode: "live" });
    useShellStore.getState().panicStop();
    expect(useShellStore.getState().osMode).toBe("dry-run");
    expect(useShellStore.getState().armed).toBe(false);
  });

  it("enableOsLive requires ARM", () => {
    expect(useShellStore.getState().enableOsLive()).toBe(false);
    useShellStore.getState().arm();
    expect(useShellStore.getState().enableOsLive()).toBe(true);
    expect(useShellStore.getState().osMode).toBe("live");
  });

  it("enableOsLive refuses when gym missing even if armed flag is set", () => {
    useShellStore.setState({
      armed: true,
      profile: { ...DEFAULT_PROFILE },
    });
    expect(useShellStore.getState().enableOsLive()).toBe(false);
    expect(useShellStore.getState().osMode).not.toBe("live");
  });

  it("drift auto-HOLD after 60s of bad confidence while armed", () => {
    expect(useShellStore.getState().arm()).toBe(true);
    const t0 = Date.now();
    useShellStore.setState({
      confidenceSamples: [{ t: t0, c: 0.1 }],
      driftBadSince: t0 - 60_001,
    });
    useShellStore.getState().evaluateDrift(t0);
    expect(useShellStore.getState().driftNudge).toBe(true);
    expect(useShellStore.getState().hold).toBe(true);
    expect(useShellStore.getState().osMode).not.toBe("live");
  });

  it("dry-run preview names the click mapping", () => {
    useShellStore.getState().completeGym({
      missRate: 0.1,
      remap: { from: "confirm", to: "switch", reason: "test" },
    });
    useShellStore.getState().setOsMode("dry-run");
    useShellStore.getState().applyIntent({
      type: "switch_binary",
      index: 0,
      active: true,
      t: Date.now(),
    });
    const text = useShellStore.getState().osPreview.map((l) => l.text).join("\n");
    expect(text).toMatch(/CLICK/);
    expect(text).toMatch(/switch/);
  });
});
