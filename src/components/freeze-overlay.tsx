"use client";

import { useEffect, useRef, useState } from "react";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatBridgeMessageAge } from "@/lib/bridge/health";

/**
 * Full-viewport freeze UI (below panic bar).
 * Shown for STOP or HOLD — blocks actuation surface, large release targets.
 */
export function FreezeOverlay() {
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const freezeReason = useShellStore((s) => s.freezeReason);
  const frozenAt = useShellStore((s) => s.frozenAt);
  const mode = useShellStore((s) => s.mode);
  const confidence = useShellStore((s) => s.confidence);
  const connection = useShellStore((s) => s.connection);
  const bridgeLastMessageAt = useShellStore((s) => s.bridgeLastMessageAt);
  const osMode = useShellStore((s) => s.osMode);
  const releaseHold = useShellStore((s) => s.releaseHold);
  const active = hold || frozen;

  const [elapsedSec, setElapsedSec] = useState(0);
  const releaseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active || !frozenAt) {
      setElapsedSec(0);
      return;
    }
    const tick = () => setElapsedSec(Math.floor((Date.now() - frozenAt) / 1000));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [active, frozenAt]);

  useEffect(() => {
    if (!active) return;
    // Move focus to primary release control for keyboard path
    const t = window.setTimeout(() => releaseRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [active, freezeReason]);

  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  if (!active) return null;

  const isStop = freezeReason === "stop" || (frozen && !hold);
  const bridgeLost = connection === "bridge-lost";
  const title = isStop
    ? "STOP — actuation frozen"
    : bridgeLost
      ? "HOLD — Bridge lost"
      : "HOLD — temporary freeze";
  const why = isStop
    ? "Pending actions cancelled. Mode set to idle. No mode changes or actuation until you release."
    : bridgeLost
      ? `Bridge socket closed. ${
          osMode === "dry-run" ? "OS path is dry-run. " : ""
        }Keyboard fallback when you release. Last message: ${formatBridgeMessageAge(
          bridgeLastMessageAt,
          Date.now()
        )}.`
      : "Intent actuation is paused. Confidence still updates for monitoring. Release when ready.";

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
  const ss = String(elapsedSec % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-40 flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="freeze-title"
      aria-describedby="freeze-desc"
    >
      {/* Scrim */}
      <div
        className={cn(
          "absolute inset-0 backdrop-blur-[2px]",
          isStop ? "bg-red-950/75" : "bg-amber-950/70"
        )}
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl border-2 p-5 shadow-2xl sm:p-7",
          isStop
            ? "border-red-500/70 bg-shell-panel ring-2 ring-red-500/30"
            : "border-amber-400/70 bg-shell-panel ring-2 ring-amber-400/30"
        )}
      >
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p
            className={cn(
              "text-xs font-bold tracking-widest uppercase",
              isStop ? "text-red-300" : "text-amber-200"
            )}
          >
            {isStop ? "Panic freeze" : "Hold freeze"}
          </p>
          <p className="font-mono text-sm text-shell-muted tabular-nums" aria-live="polite">
            {mm}:{ss}
          </p>
        </div>

        <h2 id="freeze-title" className="text-2xl font-bold tracking-tight text-shell-fg sm:text-3xl">
          {title}
        </h2>
        <p id="freeze-desc" className="mt-2 text-sm leading-relaxed text-shell-muted sm:text-base">
          {why}
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-shell-border bg-shell-bg px-3 py-2">
            <dt className="text-xs text-shell-muted">Mode</dt>
            <dd className="font-mono font-semibold">{mode}</dd>
          </div>
          <div className="rounded-xl border border-shell-border bg-shell-bg px-3 py-2">
            <dt className="text-xs text-shell-muted">Confidence (monitor)</dt>
            <dd className="font-mono font-semibold tabular-nums">
              {Math.round(confidence * 100)}%
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            ref={releaseRef}
            type="button"
            onClick={releaseHold}
            className={cn(
              "shell-btn min-h-14 flex-1 px-6 text-lg font-bold",
              isStop
                ? "border-red-400 bg-red-600 text-white hover:bg-red-500"
                : "border-amber-300 bg-amber-500/90 text-black hover:bg-amber-400"
            )}
          >
            RELEASE
          </button>
          <button
            type="button"
            onClick={releaseHold}
            className="shell-btn shell-btn-secondary min-h-14 flex-1 px-4 text-base font-semibold"
            title="Space also releases"
          >
            Confirm (Space)
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-shell-muted">
          Panic bar stays on top · <kbd className="kbd">Space</kbd> release ·{" "}
          <kbd className="kbd">Esc</kbd> STOP again (re-freezes)
        </p>
      </div>
    </div>
  );
}
