"use client";

import { create } from "zustand";
import type { ConnectionState, IntentEvent, ShellMode } from "@/lib/intents/types";
import {
  DEFAULT_PROFILE,
  type ShellProfile,
  sanitizeProfile,
} from "@/lib/profiles/schema";
import { loadProfile, saveProfile } from "@/lib/profiles/storage";
import {
  buildRecording,
  MAX_RECORDED_EVENTS,
  type IntentRecording,
} from "@/lib/intents/recording";
import {
  DEFAULT_OS_ENDPOINT,
  MAX_OS_PREVIEW,
  type OsActuateMode,
  type OsPreviewLine,
} from "@/lib/os-actuate/types";
import {
  formatOsPreview,
  intentToOsSample,
  mappingGestureForSample,
} from "@/lib/os-actuate/mapper";
import { postOsSample } from "@/lib/os-actuate/client";
import { computeReadiness, meanConfidence, type ReadinessInput } from "@/lib/readiness";
import {
  calibratedEnough,
  driftIsBad,
  DRIFT_WINDOW_MS,
  gymIsFresh,
  type GymRemap,
} from "@/lib/gym";
import { intentMatchesAction } from "@/lib/intents/mapping";

export type UndoAction =
  | { kind: "mode"; from: ShellMode; to: ShellMode }
  | { kind: "type_char"; char: string }
  | { kind: "click_target"; targetId: string | null; prevId: string | null }
  | { kind: "safe_mode"; from: boolean; to: boolean };

/** Why actuation is frozen — drives freeze UI copy. */
export type FreezeReason = "stop" | "hold" | null;

export interface ShellState {
  connection: ConnectionState;
  mode: ShellMode;
  safeMode: boolean;
  hold: boolean;
  frozen: boolean;
  freezeReason: FreezeReason;
  frozenAt: number | null;
  confidence: number;
  confidenceSamples: Array<{ t: number; c: number }>;
  lastIntentAt: number | null;
  lastIntent: IntentEvent | null;
  profile: ShellProfile;
  cursor: { x: number; y: number };
  clickTargetId: string | null;
  typed: string;
  switchIndex: number;
  pendingMode: ShellMode | null;
  statusMessage: string;
  undoStack: UndoAction[];
  hydrated: boolean;
  calibrating: boolean;

  /** Actuation gate — intents only drive modes/cursor when armed (or replaying/calibrating). */
  armed: boolean;

  /** Local intent capture */
  recording: boolean;
  recordingStartedAt: number | null;
  recordedEvents: IntentEvent[];
  lastRecording: IntentRecording | null;

  /** Replay runtime flag (scheduler lives in IntentHost) */
  replaying: boolean;

  /**
   * Actuate OS path (suite glue → Intent→OS).
   * Default dry-run: preview only. Live posts to local endpoint.
   */
  osMode: OsActuateMode;
  osEndpoint: string;
  osPreview: OsPreviewLine[];
  osLastSampleAt: number | null;
  osLiveOk: boolean | null;
  osPostCount: number;
  osErrorCount: number;

  /** Drift nudge: rolling confidence bad while armed — never silent remap. */
  driftNudge: boolean;
  driftBadSince: number | null;

  // Actions
  hydrate: () => void;
  setConnection: (c: ConnectionState) => void;
  setConfidence: (n: number) => void;
  setStatus: (msg: string) => void;
  setSafeMode: (on: boolean) => void;
  requestMode: (mode: ShellMode) => void;
  confirmPendingMode: () => void;
  cancelPendingMode: () => void;
  setModeImmediate: (mode: ShellMode, recordUndo?: boolean) => void;
  panicStop: () => void;
  panicHold: () => void;
  releaseHold: () => void;
  undo: () => void;
  applyIntent: (event: IntentEvent) => void;
  setProfile: (p: Partial<ShellProfile>) => void;
  replaceProfile: (p: ShellProfile) => void;
  appendTyped: (ch: string) => void;
  backspaceTyped: () => void;
  setClickTarget: (id: string | null) => void;
  setSwitchIndex: (i: number) => void;
  setCalibrating: (on: boolean) => void;
  completeCalibration: (partial: Partial<ShellProfile>) => void;
  completeGym: (opts: { missRate: number; remap?: GymRemap }) => void;

  arm: () => boolean;
  disarm: () => void;
  evaluateDrift: (now?: number) => void;
  clearDriftNudge: () => void;

  startRecording: () => void;
  stopRecording: () => IntentRecording | null;
  clearRecording: () => void;
  loadRecording: (rec: IntentRecording) => void;
  setReplaying: (on: boolean) => void;

  setOsMode: (mode: OsActuateMode) => void;
  setOsEndpoint: (url: string) => void;
  clearOsPreview: () => void;
  enableOsLive: () => boolean;
  pushOsPreview: (line: Omit<OsPreviewLine, "id">) => void;
}

const MAX_UNDO = 40;
const MAX_SAMPLES = 48;
let osPreviewSeq = 0;
let lastOsPreviewMs = 0;

export const useShellStore = create<ShellState>((set, get) => ({
  connection: "disconnected",
  mode: "idle",
  safeMode: true,
  hold: false,
  frozen: false,
  freezeReason: null,
  frozenAt: null,
  confidence: 0,
  confidenceSamples: [],
  lastIntentAt: null,
  lastIntent: null,
  profile: { ...DEFAULT_PROFILE },
  cursor: { x: 0.5, y: 0.5 },
  clickTargetId: null,
  typed: "",
  switchIndex: 0,
  pendingMode: null,
  statusMessage: "Disconnected — start a synthetic session to begin.",
  undoStack: [],
  hydrated: false,
  calibrating: false,
  armed: false,
  recording: false,
  recordingStartedAt: null,
  recordedEvents: [],
  lastRecording: null,
  replaying: false,
  osMode: "off",
  osEndpoint: DEFAULT_OS_ENDPOINT,
  osPreview: [],
  osLastSampleAt: null,
  osLiveOk: null,
  osPostCount: 0,
  osErrorCount: 0,
  driftNudge: false,
  driftBadSince: null,

  hydrate: () => {
    if (get().hydrated) return;
    const profile = loadProfile();
    const gymOk = gymIsFresh(profile.lastGymAt, profile.lastGymMissRate);
    set({
      profile,
      safeMode: profile.safeMode,
      mode: profile.defaultMode,
      hydrated: true,
      statusMessage: gymOk
        ? "Ready. Connect a session, then ARM when Session Ready allows."
        : "Gym required before ARM — open /gym (slice). Calibrate first if this is a new profile.",
    });
  },

  setConnection: (connection) => {
    const was = get().connection;
    set({
      connection,
      statusMessage:
        connection === "disconnected"
          ? "Disconnected."
          : connection === "synthetic"
            ? "Synthetic session active — check readiness, then ARM."
            : connection === "bridge-sim"
              ? "Bridge simulator connected."
              : "Bridge remote (local WS / channel).",
    });
    if (connection === "disconnected" && was !== "disconnected") {
      set({ armed: false });
    }
  },

  setConfidence: (confidence) => set({ confidence: clamp01(confidence) }),

  setStatus: (statusMessage) => set({ statusMessage }),

  setSafeMode: (on) => {
    const prev = get().safeMode;
    if (prev === on) return;
    pushUndo(set, get, { kind: "safe_mode", from: prev, to: on });
    set({ safeMode: on });
    const profile = sanitizeProfile({ ...get().profile, safeMode: on });
    saveProfile(profile);
    set({ profile });
  },

  requestMode: (mode) => {
    const { safeMode, mode: current, hold, frozen } = get();
    if (hold || frozen) {
      set({ statusMessage: "HOLD/STOP active — release before changing mode." });
      return;
    }
    if (mode === current) {
      set({ pendingMode: null });
      return;
    }
    if (safeMode) {
      set({
        pendingMode: mode,
        statusMessage: `Safe mode: confirm switch to “${mode}” (Space / Confirm).`,
      });
      return;
    }
    get().setModeImmediate(mode, true);
  },

  confirmPendingMode: () => {
    const { pendingMode, hold, frozen } = get();
    if (!pendingMode || hold || frozen) return;
    get().setModeImmediate(pendingMode, true);
    set({ pendingMode: null });
  },

  cancelPendingMode: () => set({ pendingMode: null, statusMessage: "Mode change cancelled." }),

  setModeImmediate: (mode, recordUndo = true) => {
    const from = get().mode;
    if (from === mode) return;
    if (recordUndo) pushUndo(set, get, { kind: "mode", from, to: mode });
    set({
      mode,
      pendingMode: null,
      statusMessage: `Mode: ${mode}`,
    });
  },

  panicStop: () => {
    const from = get().mode;
    if (from !== "idle") {
      pushUndo(set, get, { kind: "mode", from, to: "idle" });
    }
    // Capture recording if mid-capture
    let lastRecording = get().lastRecording;
    if (get().recording && get().recordingStartedAt) {
      lastRecording = buildRecording(
        get().recordedEvents,
        get().recordingStartedAt!,
        "stop-capture"
      );
    }
    const prevOs = get().osMode;
    set({
      mode: "idle",
      pendingMode: null,
      frozen: true,
      hold: false,
      freezeReason: "stop",
      frozenAt: Date.now(),
      armed: false,
      recording: false,
      recordingStartedAt: null,
      replaying: false,
      lastRecording,
      // Safety: live OS path always drops to dry-run or off on STOP
      osMode: prevOs === "live" ? "dry-run" : prevOs,
      statusMessage:
        "STOP — disarmed, frozen, mode → idle. OS live disabled. RELEASE then re-ARM to actuate.",
    });
    if (prevOs === "live") {
      get().pushOsPreview({
        at: Date.now(),
        kind: "info",
        text: "STOP — live OS posts halted (now dry-run)",
      });
    }
  },

  panicHold: () => {
    set({
      hold: true,
      freezeReason: "hold",
      frozenAt: Date.now(),
      statusMessage: "HOLD — temporary freeze. Press RELEASE / Space to continue.",
    });
  },

  releaseHold: () => {
    const reason = get().freezeReason;
    set({
      hold: false,
      frozen: false,
      freezeReason: null,
      frozenAt: null,
      statusMessage:
        reason === "stop"
          ? "STOP released — still disarmed until you ARM (mode idle)."
          : "Hold released — actuation depends on ARM state.",
    });
  },

  undo: () => {
    const stack = [...get().undoStack];
    const action = stack.pop();
    if (!action) {
      set({ statusMessage: "Nothing to undo." });
      return;
    }
    set({ undoStack: stack });
    switch (action.kind) {
      case "mode":
        set({ mode: action.from, pendingMode: null, statusMessage: `Undo mode → ${action.from}` });
        break;
      case "type_char":
        set((s) => ({
          typed: s.typed.endsWith(action.char)
            ? s.typed.slice(0, -action.char.length)
            : s.typed.slice(0, -1),
          statusMessage: "Undo last typed character.",
        }));
        break;
      case "click_target":
        set({
          clickTargetId: action.prevId,
          statusMessage: "Undo click highlight.",
        });
        break;
      case "safe_mode":
        set({ safeMode: action.from, statusMessage: `Undo safe mode → ${action.from}` });
        break;
    }
  },

  applyIntent: (event) => {
    const state = get();

    // Always capture while recording (including frozen — useful for demos)
    if (state.recording) {
      const recordedEvents = [...state.recordedEvents, event].slice(-MAX_RECORDED_EVENTS);
      set({ recordedEvents });
    }

    const pushSample = (c: number, t: number) => {
      const confidenceSamples = [...get().confidenceSamples, { t, c: clamp01(c) }].slice(
        -MAX_SAMPLES
      );
      set({
        confidence: clamp01(c),
        confidenceSamples,
        lastIntentAt: t,
        lastIntent: event,
      });
    };

    if (state.hold || state.frozen) {
      if (event.type === "class_label") {
        pushSample(event.confidence, event.t);
      } else if (event.type === "velocity_2d") {
        const speed = Math.hypot(event.vx, event.vy);
        pushSample(0.3 + speed * 0.5, event.t);
      } else {
        set({ lastIntentAt: event.t });
      }
      return;
    }

    const openChannel =
      state.connection !== "disconnected" ||
      state.calibrating ||
      state.replaying;

    if (!openChannel && event.type !== "synthetic") {
      return;
    }

    if (event.type === "synthetic" && event.name === "stop") {
      get().panicStop();
      return;
    }

    set({ lastIntentAt: event.t, lastIntent: event });

    const mayActuate = state.armed || state.replaying || state.calibrating;

    if (event.type === "velocity_2d") {
      const speed = Math.hypot(event.vx, event.vy);
      pushSample(0.3 + speed * 0.5, event.t);
      if (mayActuate && (state.mode === "point" || state.mode === "click")) {
        const scale = state.safeMode ? 0.012 : 0.02;
        set((s) => ({
          cursor: {
            x: clamp01(s.cursor.x + event.vx * scale),
            y: clamp01(s.cursor.y + event.vy * scale),
          },
        }));
      }
      // OS path: stream velocity when shell would actuate (or dry-run with session)
      maybeEmitOs(get, event);
      return;
    }

    if (event.type === "class_label") {
      pushSample(event.confidence, event.t);
      maybeEmitOs(get, event);
      if (!mayActuate) return;

      const threshold = state.profile.confidenceThreshold * (state.safeMode ? 1.05 : 1);
      if (event.confidence < threshold) return;

      if (state.pendingMode && intentMatchesAction(event, "confirm", state.profile.mappings)) {
        get().confirmPendingMode();
        return;
      }

      if (state.mode === "click" && intentMatchesAction(event, "click", state.profile.mappings)) {
        const id = quadrantTarget(state.cursor.x, state.cursor.y);
        get().setClickTarget(id);
        return;
      }
      return;
    }

    if (event.type === "switch_binary" && event.active) {
      pushSample(0.8, event.t);
      maybeEmitOs(get, event);
      if (mayActuate) {
        set({ switchIndex: event.index });
        if (
          state.mode === "click" &&
          intentMatchesAction(event, "click", state.profile.mappings)
        ) {
          const id = quadrantTarget(state.cursor.x, state.cursor.y);
          get().setClickTarget(id);
        }
      }
    }

    if (event.type === "synthetic" && event.name === "dwell") {
      pushSample(0.9, event.t);
      maybeEmitOs(get, event);
      if (
        mayActuate &&
        state.mode === "click" &&
        intentMatchesAction(event, "click", state.profile.mappings)
      ) {
        const id = quadrantTarget(state.cursor.x, state.cursor.y);
        get().setClickTarget(id);
      }
    }
  },

  setProfile: (partial) => {
    const profile = sanitizeProfile({ ...get().profile, ...partial });
    saveProfile(profile);
    set({
      profile,
      safeMode: profile.safeMode,
      statusMessage: `Profile “${profile.name}” saved.`,
    });
  },

  replaceProfile: (p) => {
    const profile = sanitizeProfile(p);
    saveProfile(profile);
    set({
      profile,
      safeMode: profile.safeMode,
      mode: profile.defaultMode,
      statusMessage: `Profile “${profile.name}” loaded.`,
    });
  },

  appendTyped: (ch) => {
    pushUndo(set, get, { kind: "type_char", char: ch });
    set((s) => ({ typed: (s.typed + ch).slice(0, 200) }));
  },

  backspaceTyped: () => {
    const { typed } = get();
    if (!typed) return;
    const stack = [...get().undoStack];
    const last = stack[stack.length - 1];
    if (last?.kind === "type_char" && typed.endsWith(last.char)) {
      stack.pop();
      set({ typed: typed.slice(0, -last.char.length), undoStack: stack });
      return;
    }
    set({ typed: typed.slice(0, -1) });
  },

  setClickTarget: (id) => {
    const prev = get().clickTargetId;
    if (prev === id) return;
    pushUndo(set, get, { kind: "click_target", targetId: id, prevId: prev });
    set({ clickTargetId: id, statusMessage: id ? `Selected: ${id}` : "Selection cleared." });
  },

  setSwitchIndex: (switchIndex) => set({ switchIndex }),

  setCalibrating: (calibrating) => set({ calibrating }),

  completeCalibration: (partial) => {
    const profile = sanitizeProfile({
      ...get().profile,
      ...partial,
      calibratedAt: new Date().toISOString(),
    });
    saveProfile(profile);
    set({
      profile,
      safeMode: profile.safeMode,
      calibrating: false,
      statusMessage: `Calibration saved to “${profile.name}”.`,
    });
  },

  completeGym: ({ missRate, remap }) => {
    const prev = get().profile;
    const mappings = { ...prev.mappings };
    if (remap) {
      mappings.click = remap.to;
    }
    const profile = sanitizeProfile({
      ...prev,
      mappings,
      lastGymAt: Date.now(),
      lastGymMissRate: missRate,
      gymRemap: remap ?? prev.gymRemap,
    });
    saveProfile(profile);
    set({
      profile,
      driftNudge: false,
      driftBadSince: null,
      statusMessage: remap
        ? `Gym saved — remapped click ${remap.from} → ${remap.to} (miss ${Math.round(missRate * 100)}%).`
        : `Gym slice saved — miss ${Math.round(missRate * 100)}%. ARM when Session Ready allows.`,
    });
  },

  arm: () => {
    const s = get();
    const readiness = computeReadiness(readinessInputFromState(s));
    if (!readiness.canArm) {
      set({
        statusMessage: `Cannot ARM — ${readiness.summary}`,
      });
      return false;
    }
    set({
      armed: true,
      statusMessage: "ARMED — intent streams may actuate. STOP always disarms.",
    });
    return true;
  },

  disarm: () => {
    const osMode = get().osMode === "live" ? "dry-run" : get().osMode;
    set({
      armed: false,
      osMode,
      statusMessage: "Disarmed — monitoring only (no intent actuation). OS live off.",
    });
  },

  setOsMode: (mode) => {
    if (mode === "live") {
      get().enableOsLive();
      return;
    }
    set({
      osMode: mode,
      statusMessage:
        mode === "dry-run"
          ? "OS actuate: dry-run (preview only — no pointer)."
          : "OS actuate: off.",
    });
    get().pushOsPreview({
      at: Date.now(),
      kind: "info",
      text: mode === "dry-run" ? "Dry-run preview enabled" : "OS path off",
    });
  },

  setOsEndpoint: (url) => {
    const trimmed = url.trim().slice(0, 200) || DEFAULT_OS_ENDPOINT;
    set({ osEndpoint: trimmed, osLiveOk: null });
  },

  clearOsPreview: () => set({ osPreview: [], osPostCount: 0, osErrorCount: 0 }),

  enableOsLive: () => {
    const s = get();
    if (s.hold || s.frozen) {
      set({ statusMessage: "Cannot enable OS live while frozen." });
      return false;
    }
    if (!s.armed && !s.replaying) {
      set({ statusMessage: "ARM the shell before enabling OS live posts." });
      return false;
    }
    const readiness = computeReadiness(readinessInputFromState(s));
    if (!s.replaying && !readiness.canArm) {
      set({ statusMessage: "Cannot enable OS live — Session Ready cannot ARM." });
      return false;
    }
    if (!calibratedEnough(s.profile) || !s.profile.mappings.click) {
      set({ statusMessage: "Cannot enable OS live — gym mapping missing or stale. Run /gym." });
      return false;
    }
    set({
      osMode: "live",
      statusMessage: `OS live → POST ${s.osEndpoint} (STOP drops to dry-run).`,
    });
    get().pushOsPreview({
      at: Date.now(),
      kind: "info",
      text: `Live enabled → ${s.osEndpoint} · click←${s.profile.mappings.click}`,
    });
    return true;
  },

  evaluateDrift: (now = Date.now()) => {
    const s = get();
    if (!s.armed || s.hold || s.frozen) {
      if (!s.armed) set({ driftBadSince: null });
      return;
    }
    const mean = meanConfidence(s.confidenceSamples, 2500, now);
    if (!driftIsBad(mean)) {
      if (s.driftBadSince != null) set({ driftBadSince: null });
      return;
    }
    const since = s.driftBadSince ?? now;
    if (s.driftBadSince == null) set({ driftBadSince: now });
    if (now - since >= DRIFT_WINDOW_MS && !s.driftNudge) {
      set({
        driftNudge: true,
        statusMessage: "Signal drift — run gym. HOLD applied (no silent remap).",
      });
      get().panicHold();
    }
  },

  clearDriftNudge: () => set({ driftNudge: false, driftBadSince: null }),

  pushOsPreview: (line) => {
    osPreviewSeq += 1;
    const entry: OsPreviewLine = { ...line, id: osPreviewSeq };
    set((st) => ({
      osPreview: [entry, ...st.osPreview].slice(0, MAX_OS_PREVIEW),
    }));
  },

  startRecording: () => {
    set({
      recording: true,
      recordingStartedAt: Date.now(),
      recordedEvents: [],
      statusMessage: "Recording intents… STOP ends capture; use Export when done.",
    });
  },

  stopRecording: () => {
    const { recording, recordedEvents, recordingStartedAt } = get();
    if (!recording || !recordingStartedAt) {
      set({ recording: false, recordingStartedAt: null });
      return get().lastRecording;
    }
    const rec = buildRecording(recordedEvents, recordingStartedAt, "neurashell-capture");
    set({
      recording: false,
      recordingStartedAt: null,
      lastRecording: rec,
      statusMessage: `Recording stopped — ${rec.events.length} events. Export or replay.`,
    });
    return rec;
  },

  clearRecording: () => {
    set({
      recordedEvents: [],
      lastRecording: null,
      recording: false,
      recordingStartedAt: null,
      statusMessage: "Recording buffer cleared.",
    });
  },

  loadRecording: (rec) => {
    set({
      lastRecording: rec,
      recordedEvents: rec.events.map((e) => ({ ...e })),
      recording: false,
      recordingStartedAt: null,
      statusMessage: `Loaded recording “${rec.name}” (${rec.events.length} events).`,
    });
  },

  setReplaying: (replaying) => {
    set({
      replaying,
      statusMessage: replaying
        ? "Replaying recording — actuation allowed for playback."
        : "Replay finished.",
    });
  },
}));

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export function readinessInputFromState(
  s: Pick<
    ShellState,
    | "connection"
    | "hold"
    | "frozen"
    | "armed"
    | "safeMode"
    | "lastIntentAt"
    | "confidence"
    | "confidenceSamples"
    | "profile"
    | "replaying"
    | "recording"
    | "driftNudge"
  >,
  now = Date.now()
): ReadinessInput {
  return {
    connected: s.connection !== "disconnected",
    frozen: s.hold || s.frozen,
    armed: s.armed,
    safeMode: s.safeMode,
    msSinceIntent: s.lastIntentAt == null ? null : now - s.lastIntentAt,
    confidence: s.confidence,
    confidenceMean: meanConfidence(s.confidenceSamples, 2500, now),
    confidenceThreshold: s.profile.confidenceThreshold,
    replaying: s.replaying,
    recording: s.recording,
    lastGymAt: s.profile.lastGymAt ?? null,
    lastGymMissRate: s.profile.lastGymMissRate ?? null,
    driftNudge: s.driftNudge,
  };
}

/**
 * Forward intents to OS dry-run preview and optional live HTTP POST.
 * Dry-run never touches the system pointer — browser cannot move OS mouse without
 * a local helper; live mode only POSTs JSON to localhost for Intent→OS / relay.
 */
function maybeEmitOs(get: () => ShellState, event: IntentEvent) {
  const state = get();
  if (state.osMode === "off") return;
  if (state.hold || state.frozen) return;

  // Dry-run can preview with a session; live requires ARM + gym mapping (or replay)
  if (state.osMode === "live") {
    const liveOk =
      (state.armed || state.replaying) &&
      (state.replaying ||
        (computeReadiness(readinessInputFromState(state)).canArm &&
          calibratedEnough(state.profile)));
    if (!liveOk) return;
  } else {
    const mayStream =
      state.connection !== "disconnected" || state.replaying || state.calibrating;
    if (!mayStream) return;
  }

  // Prefer OS stream in point/click; still allow click events in other modes
  if (
    event.type === "velocity_2d" &&
    state.mode !== "point" &&
    state.mode !== "click" &&
    state.mode !== "idle"
  ) {
    // still allow in idle for monitoring dry-run
  }

  const sample = intentToOsSample(event, {
    clickThreshold: state.profile.confidenceThreshold,
    mappings: state.profile.mappings,
  });
  if (!sample) return;

  const now = Date.now();
  const isClick = sample.click >= 0.85;
  const moving = Math.hypot(sample.vx, sample.vy) > 0.04;
  // Throttle preview lines for continuous velocity
  if (!isClick && moving && now - lastOsPreviewMs < 90) {
    if (state.osMode === "live") {
      // still post live at higher rate, but don't flood the log
      void postLive(get, sample);
    }
    return;
  }
  if (!isClick && !moving && now - lastOsPreviewMs < 400) return;
  lastOsPreviewMs = now;

  const mode = state.osMode === "live" ? "live" : "dry-run";
  const via = mappingGestureForSample(event, state.profile.mappings);
  const fmt = formatOsPreview(
    sample,
    mode === "live" ? "live" : "dry-run",
    false,
    via,
    state.profile.mappings.click
  );
  get().pushOsPreview({ at: now, kind: fmt.kind, text: fmt.text });
  setOsLast(get, now);

  if (state.osMode === "live") {
    void postLive(get, sample);
  }
}

function setOsLast(get: () => ShellState, at: number) {
  useShellStore.setState({ osLastSampleAt: at });
}

async function postLive(get: () => ShellState, sample: ReturnType<typeof intentToOsSample>) {
  if (!sample) return;
  const { osEndpoint } = get();
  const result = await postOsSample(osEndpoint, sample);
  if (result.ok) {
    useShellStore.setState((s) => ({
      osLiveOk: true,
      osPostCount: s.osPostCount + 1,
    }));
  } else {
    useShellStore.setState((s) => ({
      osLiveOk: false,
      osErrorCount: s.osErrorCount + 1,
    }));
    // Don't spam errors every frame
    if (get().osErrorCount <= 3 || get().osErrorCount % 25 === 0) {
      get().pushOsPreview({
        at: Date.now(),
        kind: "error",
        text: `POST failed: ${result.error ?? "unknown"} (is relay running?)`,
      });
    }
  }
}


function pushUndo(
  set: (partial: Partial<ShellState> | ((s: ShellState) => Partial<ShellState>)) => void,
  get: () => ShellState,
  action: UndoAction
) {
  const undoStack = [...get().undoStack, action].slice(-MAX_UNDO);
  set({ undoStack });
}

function quadrantTarget(x: number, y: number): string {
  const col = x < 0.5 ? "L" : "R";
  const row = y < 0.5 ? "T" : "B";
  return `target-${row}${col}`;
}
