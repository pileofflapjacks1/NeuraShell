"use client";

import { useCallback, useEffect, useRef } from "react";
import { createKeyboardAdapter, createSyntheticAdapter } from "@/lib/intents";
import { createBridgeRemoteAdapter } from "@/lib/bridge/client";
import { createReplayAdapter } from "@/lib/intents/recording";
import type { IntentRecording } from "@/lib/intents/recording";
import { useShellStore } from "@/lib/store";
import type { IntentAdapter } from "@/lib/intents/types";

/**
 * Wires keyboard global shortcuts + optional adapters into the store.
 * Mount once at shell root.
 */
export function IntentHost({
  onAdaptersReady,
}: {
  onAdaptersReady?: (api: IntentSessionApi) => void;
}) {
  const hydrate = useShellStore((s) => s.hydrate);
  const applyIntent = useShellStore((s) => s.applyIntent);
  const setConnection = useShellStore((s) => s.setConnection);
  const panicStop = useShellStore((s) => s.panicStop);
  const undo = useShellStore((s) => s.undo);
  const confirmPendingMode = useShellStore((s) => s.confirmPendingMode);
  const releaseHold = useShellStore((s) => s.releaseHold);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const pendingMode = useShellStore((s) => s.pendingMode);
  const setReplaying = useShellStore((s) => s.setReplaying);

  const synthRef = useRef<IntentAdapter | null>(null);
  const keyboardRef = useRef<IntentAdapter | null>(null);
  const bridgeRef = useRef<IntentAdapter | null>(null);
  const replayRef = useRef<ReturnType<typeof createReplayAdapter> | null>(null);

  const stopReplay = useCallback(() => {
    replayRef.current?.stop();
    replayRef.current = null;
    setReplaying(false);
  }, [setReplaying]);

  const stopAll = useCallback(() => {
    stopReplay();
    synthRef.current?.stop();
    synthRef.current = null;
    bridgeRef.current?.stop();
    bridgeRef.current = null;
    setConnection("disconnected");
  }, [setConnection, stopReplay]);

  const startSynthetic = useCallback(() => {
    stopReplay();
    bridgeRef.current?.stop();
    bridgeRef.current = null;
    synthRef.current?.stop();
    const adapter = createSyntheticAdapter();
    synthRef.current = adapter;
    adapter.start(applyIntent);
    setConnection("synthetic");
  }, [applyIntent, setConnection, stopReplay]);

  const startBridgeRemote = useCallback(() => {
    stopReplay();
    synthRef.current?.stop();
    synthRef.current = null;
    bridgeRef.current?.stop();
    const adapter = createBridgeRemoteAdapter();
    bridgeRef.current = adapter;
    adapter.start(applyIntent);
    setConnection("bridge-remote");
  }, [applyIntent, setConnection, stopReplay]);

  const startReplay = useCallback(
    (rec: IntentRecording) => {
      if (!rec.events.length) return;
      // Pause live synthetic/bridge so replay is clean
      synthRef.current?.stop();
      synthRef.current = null;
      bridgeRef.current?.stop();
      bridgeRef.current = null;
      replayRef.current?.stop();

      const adapter = createReplayAdapter(rec.events);
      replayRef.current = adapter;
      setReplaying(true);
      setConnection("synthetic");
      useShellStore.getState().setStatus(`Replaying “${rec.name}” (${rec.events.length} events)…`);
      adapter.start(applyIntent, () => {
        replayRef.current = null;
        setReplaying(false);
        useShellStore.getState().setStatus("Replay complete.");
      });
    },
    [applyIntent, setConnection, setReplaying]
  );

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Keyboard adapter always on for velocity / switch / confirm intents
  useEffect(() => {
    const kb = createKeyboardAdapter();
    keyboardRef.current = kb;
    kb.start(applyIntent);
    return () => {
      kb.stop();
      keyboardRef.current = null;
    };
  }, [applyIntent]);

  // Global panic / undo / confirm shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        e.preventDefault();
        stopReplay();
        panicStop();
        return;
      }

      const isUndo =
        (e.key === "z" || e.key === "Z") && (e.metaKey || e.ctrlKey) && !e.shiftKey;
      if (isUndo) {
        e.preventDefault();
        undo();
        return;
      }

      if (e.key === " " || e.code === "Space") {
        if (pendingMode || hold || frozen) {
          e.preventDefault();
          if (hold || frozen) releaseHold();
          else confirmPendingMode();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    panicStop,
    undo,
    confirmPendingMode,
    releaseHold,
    hold,
    frozen,
    pendingMode,
    stopReplay,
  ]);

  useEffect(() => {
    onAdaptersReady?.({
      startSynthetic,
      stopSession: stopAll,
      startBridgeRemote,
      startReplay,
      stopReplay,
    });
  }, [
    onAdaptersReady,
    startSynthetic,
    stopAll,
    startBridgeRemote,
    startReplay,
    stopReplay,
  ]);

  useEffect(() => {
    return () => {
      synthRef.current?.stop();
      bridgeRef.current?.stop();
      replayRef.current?.stop();
    };
  }, []);

  // If store panicStop cleared replaying, ensure timers stop
  useEffect(() => {
    const unsub = useShellStore.subscribe((state, prev) => {
      if (prev.replaying && !state.replaying && replayRef.current) {
        replayRef.current.stop();
        replayRef.current = null;
      }
    });
    return unsub;
  }, []);

  return null;
}

export interface IntentSessionApi {
  startSynthetic: () => void;
  stopSession: () => void;
  startBridgeRemote: () => void;
  startReplay: (rec: IntentRecording) => void;
  stopReplay: () => void;
}
