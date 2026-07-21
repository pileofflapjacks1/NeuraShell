"use client";

import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/intents/types";

const LABELS: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  synthetic: "Synthetic",
  "bridge-sim": "Bridge sim",
  "bridge-remote": "Bridge remote",
};

const DOT: Record<ConnectionState, string> = {
  disconnected: "bg-zinc-500",
  synthetic: "bg-emerald-400",
  "bridge-sim": "bg-sky-400",
  "bridge-remote": "bg-violet-400",
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
  const safeMode = useShellStore((s) => s.safeMode);
  const setSafeMode = useShellStore((s) => s.setSafeMode);
  const statusMessage = useShellStore((s) => s.statusMessage);
  const active = connection !== "disconnected";

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
        <div className="flex items-center gap-2 rounded-full border border-shell-border bg-shell-bg px-3 py-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", DOT[connection])} aria-hidden />
          <span className="text-sm font-medium text-shell-fg">{LABELS[connection]}</span>
        </div>
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
            onClick={onStopSession}
            className="shell-btn shell-btn-secondary min-h-12 min-w-[10rem] px-5"
          >
            End session
          </button>
        )}
        {onTryBridge && (
          <button
            type="button"
            onClick={onTryBridge}
            className="shell-btn shell-btn-ghost min-h-12 px-4"
            title="Optional: ws://127.0.0.1:7711 or BroadcastChannel"
          >
            Try Bridge remote
          </button>
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
          ON.
        </p>
      </div>
    </section>
  );
}
