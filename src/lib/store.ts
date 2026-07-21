"use client";

import { create } from "zustand";
import type { ConnectionState, IntentEvent, ShellMode } from "@/lib/intents/types";
import {
  DEFAULT_PROFILE,
  type ShellProfile,
  sanitizeProfile,
} from "@/lib/profiles/schema";
import { loadProfile, saveProfile } from "@/lib/profiles/storage";

export type UndoAction =
  | { kind: "mode"; from: ShellMode; to: ShellMode }
  | { kind: "type_char"; char: string }
  | { kind: "click_target"; targetId: string | null; prevId: string | null }
  | { kind: "safe_mode"; from: boolean; to: boolean };

export interface ShellState {
  connection: ConnectionState;
  mode: ShellMode;
  safeMode: boolean;
  hold: boolean;
  frozen: boolean;
  confidence: number;
  lastIntentAt: number | null;
  profile: ShellProfile;
  // Point mode soft cursor (normalized 0–1 canvas coords)
  cursor: { x: number; y: number };
  // Click / highlight target
  clickTargetId: string | null;
  // Type buffer
  typed: string;
  // Switch scan
  switchIndex: number;
  // Pending mode change when Safe mode requires confirm
  pendingMode: ShellMode | null;
  // Status line for demo / UX
  statusMessage: string;
  undoStack: UndoAction[];
  // Hydration
  hydrated: boolean;

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
}

const MAX_UNDO = 40;

export const useShellStore = create<ShellState>((set, get) => ({
  connection: "disconnected",
  mode: "idle",
  safeMode: true,
  hold: false,
  frozen: false,
  confidence: 0,
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

  hydrate: () => {
    if (get().hydrated) return;
    const profile = loadProfile();
    set({
      profile,
      safeMode: profile.safeMode,
      mode: profile.defaultMode,
      hydrated: true,
      statusMessage: "Ready. Start synthetic session or use keyboard sim.",
    });
  },

  setConnection: (connection) =>
    set({
      connection,
      statusMessage:
        connection === "disconnected"
          ? "Disconnected."
          : connection === "synthetic"
            ? "Synthetic session active."
            : connection === "bridge-sim"
              ? "Bridge simulator connected."
              : "Bridge remote (local WS / channel).",
    }),

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
    set({
      mode: "idle",
      pendingMode: null,
      frozen: true,
      hold: false,
      statusMessage: "STOP — actuation frozen, mode → idle. Start session or release via HOLD confirm.",
    });
  },

  panicHold: () => {
    set({
      hold: true,
      statusMessage: "HOLD — temporary freeze. Press Confirm / Space to release.",
    });
  },

  releaseHold: () => {
    set({
      hold: false,
      frozen: false,
      statusMessage: "Hold released — actuation available.",
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
    if (state.hold || state.frozen) {
      // Still update confidence for monitoring, no actuation
      if (event.type === "class_label") {
        set({ confidence: event.confidence, lastIntentAt: event.t });
      }
      return;
    }
    if (state.connection === "disconnected") return;

    set({ lastIntentAt: event.t });

    if (event.type === "synthetic" && event.name === "stop") {
      get().panicStop();
      return;
    }

    if (event.type === "velocity_2d") {
      const speed = Math.hypot(event.vx, event.vy);
      set({ confidence: clamp01(0.3 + speed * 0.5) });
      if (state.mode === "point" || state.mode === "click") {
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
      set({ confidence: clamp01(event.confidence) });
      const threshold = state.profile.confidenceThreshold * (state.safeMode ? 1.05 : 1);
      if (event.confidence < threshold) return;

      if (state.pendingMode && (event.label === "confirm" || event.label === "select")) {
        get().confirmPendingMode();
        return;
      }

      if (state.mode === "click" && (event.label === "confirm" || event.label === "select")) {
        // Highlight nearest soft target based on cursor quadrant
        const id = quadrantTarget(state.cursor.x, state.cursor.y);
        get().setClickTarget(id);
        return;
      }

      if (state.mode === "type" && event.label === "confirm") {
        // Confirm is handled by type board selection path via switchIndex
        return;
      }
      return;
    }

    if (event.type === "switch_binary" && event.active) {
      set({ confidence: 0.8, switchIndex: event.index });
      if (state.mode === "switch") {
        // index selects scan item
      }
      if (state.mode === "type") {
        // switch index maps to keyboard row keys — host UI handles
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
    // Treat backspace as undoing last typed char when possible
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
