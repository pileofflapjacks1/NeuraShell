"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { readinessInputFromState, useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/intents/types";
import { computeReadiness } from "@/lib/readiness";
import { gymIsFresh } from "@/lib/gym";
import { GESTURE_HINTS } from "@/lib/intents/mapping";
import {
  formatBridgeMessageAge,
  isBridgeConnection,
  SESSION_CONNECTION_LABEL,
} from "@/lib/bridge/health";

const DOT: Record<ConnectionState, string> = {
  disconnected: "bg-zinc-500",
  synthetic: "bg-emerald-400",
  "bridge-sim": "bg-sky-400",
  "bridge-connecting": "bg-amber-400",
  "bridge-remote": "bg-violet-400",
  "bridge-lost": "bg-rose-400",
};

export interface SessionReadyProps {
  onStartSynthetic: () => void;
  onStopSession: () => void;
  onTryBridge?: () => void;
}

export function SessionReady({
  onStartSynthetic,
  onStopSession,
  onTryBridge,
}: SessionReadyProps) {
  const connection = useShellStore((s) => s.connection);
  const bridgeLastMessageAt = useShellStore((s) => s.bridgeLastMessageAt);
  const osMode = useShellStore((s) => s.osMode);
  const safeMode = useShellStore((s) => s.safeMode);
  const setSafeMode = useShellStore((s) => s.setSafeMode);
  const statusMessage = useShellStore((s) => s.statusMessage);
  const armed = useShellStore((s) => s.armed);
  const arm = useShellStore((s) => s.arm);
  const disarm = useShellStore((s) => s.disarm);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const profile = useShellStore((s) => s.profile);
  const confidence = useShellStore((s) => s.confidence);
  const confidenceSamples = useShellStore((s) => s.confidenceSamples);
  const lastIntentAt = useShellStore((s) => s.lastIntentAt);
  const replaying = useShellStore((s) => s.replaying);
  const recording = useShellStore((s) => s.recording);
  const driftNudge = useShellStore((s) => s.driftNudge);
  const evaluateDrift = useShellStore((s) => s.evaluateDrift);

  const active = connection !== "disconnected";
  const bridgeLink = isBridgeConnection(connection);
  const [now, setNow] = useState(() => Date.now());
  const bridgeAge = bridgeLink ? formatBridgeMessageAge(bridgeLastMessageAt, now) : null;

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      evaluateDrift(t);
    }, 1000);
    return () => window.clearInterval(id);
  }, [evaluateDrift]);

  const readiness = useMemo(() => {
    return computeReadiness(
      readinessInputFromState(
        {
          connection,
          hold,
          frozen,
          armed,
          safeMode,
          lastIntentAt,
          confidence,
          confidenceSamples,
          profile,
          replaying,
          recording,
          driftNudge,
        },
        now
      ),
      now
    );
  }, [
    connection,
    hold,
    frozen,
    armed,
    safeMode,
    lastIntentAt,
    confidence,
    confidenceSamples,
    profile,
    replaying,
    recording,
    driftNudge,
    now,
  ]);

  const gymOk = gymIsFresh(profile.lastGymAt, profile.lastGymMissRate, now);
  const gymBlocked = !readiness.canArm && !gymOk;

  const levelColor =
    readiness.level === "ready"
      ? "text-emerald-300"
      : readiness.level === "caution"
        ? "text-amber-300"
        : "text-red-300";

  const barColor =
    readiness.level === "ready"
      ? "bg-emerald-400"
      : readiness.level === "caution"
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <section
      aria-labelledby="session-ready-heading"
      className="rounded-xl border border-shell-border bg-shell-panel p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="session-ready-heading"
          className="text-sm font-semibold tracking-wide text-shell-muted uppercase"
        >
          Session Ready
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex flex-wrap items-center gap-2 rounded-full border border-shell-border bg-shell-bg px-3 py-1.5"
            data-connection={connection}
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                DOT[connection],
                connection === "bridge-connecting" && "animate-pulse"
              )}
              aria-hidden
            />
            <span className="text-sm font-medium text-shell-fg">
              {SESSION_CONNECTION_LABEL[connection]}
            </span>
            {bridgeAge && (
              <span className="text-xs text-shell-muted tabular-nums">
                Last message: {bridgeAge}
              </span>
            )}
          </div>
          <div
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-bold",
              armed
                ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100"
                : "border-shell-border bg-shell-bg text-shell-muted"
            )}
          >
            {armed ? "ARMED" : "DISARMED"}
          </div>
        </div>
      </div>

      {connection === "bridge-connecting" && (
        <p className="mb-3 text-sm text-amber-100">
          Connecting to ws://127.0.0.1:7711. Keyboard still works.
        </p>
      )}
      {connection === "bridge-lost" && (
        <p className="mb-3 text-sm text-rose-100">
          Bridge lost. Keyboard fallback. Reconnecting.
          {hold ? " HOLD is on." : ""}
          {osMode === "dry-run" ? " OS path is dry-run." : ""}
        </p>
      )}

      {/* Readiness score */}
      <div className="mb-4 rounded-xl border border-shell-border bg-shell-bg p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-semibold tracking-wide text-shell-muted uppercase">
              Readiness
            </p>
            <p className={cn("text-4xl font-bold tabular-nums", levelColor)}>
              {readiness.score}
              <span className="text-lg text-shell-muted">/100</span>
            </p>
          </div>
          <p className={cn("text-sm font-semibold capitalize", levelColor)}>
            {readiness.level}
            {recording ? " · REC" : ""}
            {replaying ? " · REPLAY" : ""}
          </p>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={readiness.score}
          aria-label="Session readiness score"
        >
          <div
            className={cn("h-full transition-[width] duration-200", barColor)}
            style={{ width: `${readiness.score}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-shell-fg/90" role="status">
          {readiness.summary}
        </p>
        {profile.gymRemap && (
          <p className="mt-2 text-sm text-cyan-200">
            Gym remapped click → {profile.gymRemap.to} ({GESTURE_HINTS[profile.gymRemap.to]})
          </p>
        )}
        {driftNudge && (
          <p className="mt-2 text-sm text-amber-200">
            Drift detected — run gym. Mapping was not changed.
          </p>
        )}
        {gymBlocked && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/gym" className="shell-btn shell-btn-primary min-h-11 px-4 no-underline text-sm">
              Run gym
            </Link>
            <Link href="/calibrate" className="shell-btn shell-btn-secondary min-h-11 px-4 no-underline text-sm">
              Calibrate
            </Link>
          </div>
        )}
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {readiness.factors.map((f) => (
            <li
              key={f.id}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs",
                f.pass
                  ? "border-emerald-900/50 bg-emerald-950/30 text-emerald-100"
                  : f.required
                    ? "border-red-900/40 bg-red-950/20 text-red-100"
                    : "border-shell-border text-shell-muted"
              )}
            >
              <span className="font-semibold">
                {f.pass ? "✓" : "·"} {f.label}
                {f.required ? " *" : ""}
              </span>
              <span className="mt-0.5 block opacity-80">{f.detail}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] text-shell-muted">* required to ARM</p>
      </div>

      <p className="mb-4 min-h-[1.25rem] text-sm text-shell-fg/90" role="status" aria-live="polite">
        {statusMessage}
      </p>

      <div className="flex flex-wrap gap-3">
        {!active ? (
          <button
            type="button"
            onClick={onStartSynthetic}
            className="shell-btn shell-btn-primary min-h-12 min-w-[10rem] px-5"
          >
            Start synthetic session
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              disarm();
              onStopSession();
            }}
            className="shell-btn shell-btn-secondary min-h-12 min-w-[10rem] px-5"
          >
            End session
          </button>
        )}

        {armed ? (
          <button
            type="button"
            onClick={disarm}
            className="shell-btn min-h-12 min-w-[8rem] border-amber-400/50 bg-amber-500/15 px-5 font-bold text-amber-50"
          >
            DISARM
          </button>
        ) : (
          <button
            type="button"
            onClick={() => arm()}
            disabled={!readiness.canArm}
            className={cn(
              "shell-btn min-h-12 min-w-[8rem] px-5 font-bold",
              readiness.canArm
                ? "border-emerald-400/60 bg-emerald-600/40 text-emerald-50"
                : "shell-btn-secondary opacity-50"
            )}
            title={
              readiness.canArm
                ? "Enable intent actuation"
                : gymBlocked
                  ? "Gym required before ARM"
                  : "Required factors must pass — score does not bypass"
            }
          >
            ARM
          </button>
        )}

        {onTryBridge && (
          <button
            type="button"
            onClick={onTryBridge}
            className="shell-btn shell-btn-ghost min-h-12 px-4"
            title="Optional soft path: ws://127.0.0.1:7711 or BroadcastChannel neurabridge-intent. Keyboard keeps working."
          >
            Try Bridge
          </button>
        )}

        {(driftNudge || !gymOk) && (
          <Link href="/gym" className="shell-btn shell-btn-ghost min-h-12 px-4 no-underline">
            Run gym
          </Link>
        )}
        {!profile.calibratedAt && (
          <Link
            href="/calibrate"
            className="shell-btn shell-btn-ghost min-h-12 px-4 no-underline"
          >
            Calibrate
          </Link>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-shell-border pt-4">
        <button
          type="button"
          role="switch"
          aria-checked={safeMode}
          onClick={() => setSafeMode(!safeMode)}
          className={cn(
            "shell-btn min-h-12 min-w-[11rem] px-5 font-semibold",
            safeMode
              ? "border-amber-400/60 bg-amber-500/20 text-amber-100"
              : "border-shell-border bg-shell-bg text-shell-muted"
          )}
        >
          Safe mode: {safeMode ? "ON" : "OFF"}
        </button>
        <p className="max-w-md text-xs text-shell-muted">
          Large targets, higher confirm threshold, slower scan. Mode changes require confirm when
          ON. Actuation still needs ARM.
        </p>
      </div>
    </section>
  );
}
