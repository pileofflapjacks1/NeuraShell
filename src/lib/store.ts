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

  arm: () => boolean;
  disarm: () => void;

  startRecording: () => void;
  stopRecording: () => IntentRecording | null;
  clearRecording: () => void;
  loadRecording: (rec: IntentRecording) => void;
  setReplaying: (on: boolean) => void;
}

const MAX_UNDO = 40;
const MAX_SAMPLES = 48;

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

  hydrate: () => {
    if (get().hydrated) return;
    const profile = loadProfile();
    set({
      profile,
      safeMode: profile.safeMode,
      mode: profile.defaultMode,
      hydrated: true,
      statusMessage: profile.calibratedAt
        ? "Ready. Connect a session, then ARM when the readiness score allows."
        : "Ready. Calibrate, connect a session, then ARM for actuation.",
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
      statusMessage: "STOP — disarmed, frozen, mode → idle. RELEASE then re-ARM to actuate.",
    });
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
      set({ confidence: clamp01(c), confidenceSamples, lastIntentAt: t });
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

    set({ lastIntentAt: event.t });

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
      return;
    }

    if (event.type === "class_label") {
      pushSample(event.confidence, event.t);
      if (!mayActuate) return;

      const threshold = state.profile.confidenceThreshold * (state.safeMode ? 1.05 : 1);
      if (event.confidence < threshold) return;

      if (state.pendingMode && (event.label === "confirm" || event.label === "select")) {
        get().confirmPendingMode();
        return;
      }

      if (state.mode === "click" && (event.label === "confirm" || event.label === "select")) {
        const id = quadrantTarget(state.cursor.x, state.cursor.y);
        get().setClickTarget(id);
        return;
      }
      return;
    }

    if (event.type === "switch_binary" && event.active) {
      pushSample(0.8, event.t);
      if (mayActuate) {
        set({ switchIndex: event.index });
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

  arm: () => {
    const s = get();
    if (s.hold || s.frozen) {
      set({ statusMessage: "Cannot ARM while frozen — RELEASE first." });
      return false;
    }
    if (s.connection === "disconnected" && !s.replaying) {
      set({ statusMessage: "Cannot ARM without a session — start synthetic first." });
      return false;
    }
    set({
      armed: true,
      statusMessage: "ARMED — intent streams may actuate. STOP always disarms.",
    });
    return true;
  },

  disarm: () => {
    set({
      armed: false,
      statusMessage: "Disarmed — monitoring only (no intent actuation).",
    });
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
