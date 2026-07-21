"use client";

import { useCallback, useEffect, useRef } from "react";
import { createKeyboardAdapter, createSyntheticAdapter } from "@/lib/intents";
import { createBridgeRemoteAdapter } from "@/lib/bridge/client";
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

  const synthRef = useRef<IntentAdapter | null>(null);
  const keyboardRef = useRef<IntentAdapter | null>(null);
  const bridgeRef = useRef<IntentAdapter | null>(null);

  const stopAll = useCallback(() => {
    synthRef.current?.stop();
    synthRef.current = null;
    bridgeRef.current?.stop();
    bridgeRef.current = null;
    setConnection("disconnected");
  }, [setConnection]);

  const startSynthetic = useCallback(() => {
    bridgeRef.current?.stop();
    bridgeRef.current = null;
    synthRef.current?.stop();
    const adapter = createSyntheticAdapter();
    synthRef.current = adapter;
    adapter.start(applyIntent);
    setConnection("synthetic");
  }, [applyIntent, setConnection]);

  const startBridgeRemote = useCallback(() => {
    synthRef.current?.stop();
    synthRef.current = null;
    bridgeRef.current?.stop();
    const adapter = createBridgeRemoteAdapter();
    bridgeRef.current = adapter;
    adapter.start(applyIntent);
    setConnection("bridge-remote");
  }, [applyIntent, setConnection]);

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
        // Confirm pending mode or release hold
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
  ]);

  useEffect(() => {
    onAdaptersReady?.({
      startSynthetic,
      stopSession: stopAll,
      startBridgeRemote,
    });
  }, [onAdaptersReady, startSynthetic, stopAll, startBridgeRemote]);

  useEffect(() => {
    return () => {
      synthRef.current?.stop();
      bridgeRef.current?.stop();
    };
  }, []);

  return null;
}

export interface IntentSessionApi {
  startSynthetic: () => void;
  stopSession: () => void;
  startBridgeRemote: () => void;
}
