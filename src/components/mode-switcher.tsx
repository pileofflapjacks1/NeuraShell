"use client";

import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ShellMode } from "@/lib/intents/types";

const MODES: { id: ShellMode; label: string; hint: string }[] = [
  { id: "idle", label: "Idle", hint: "Monitor only" },
  { id: "point", label: "Point", hint: "2D soft cursor" },
  { id: "click", label: "Click", hint: "Confirm / select" },
  { id: "type", label: "Type", hint: "Word board" },
  { id: "switch", label: "Switch", hint: "Scan highlight" },
];

export function ModeSwitcher() {
  const mode = useShellStore((s) => s.mode);
  const pendingMode = useShellStore((s) => s.pendingMode);
  const safeMode = useShellStore((s) => s.safeMode);
  const requestMode = useShellStore((s) => s.requestMode);
  const confirmPendingMode = useShellStore((s) => s.confirmPendingMode);
  const cancelPendingMode = useShellStore((s) => s.cancelPendingMode);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);

  return (
    <section
      aria-labelledby="mode-switcher-heading"
      className="rounded-xl border border-shell-border bg-shell-panel p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="mode-switcher-heading"
          className="text-sm font-semibold tracking-wide text-shell-muted uppercase"
        >
          Mode
        </h2>
        <span className="font-mono text-sm text-cyan-300">
          active: <strong className="text-shell-fg">{mode}</strong>
          {pendingMode ? (
            <span className="ml-2 text-amber-300">pending: {pendingMode}</span>
          ) : null}
        </span>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-5"
        role="group"
        aria-label="Shell modes"
      >
        {MODES.map((m) => {
          const active = mode === m.id;
          const pending = pendingMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              disabled={hold || frozen}
              onClick={() => requestMode(m.id)}
              className={cn(
                "shell-btn flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 py-3 text-center",
                active && "border-cyan-400/70 bg-cyan-500/15 text-cyan-50 ring-1 ring-cyan-400/40",
                pending && "border-amber-400/70 bg-amber-500/15 text-amber-50",
                !active && !pending && "border-shell-border bg-shell-bg text-shell-fg"
              )}
              aria-pressed={active}
            >
              <span className="text-base font-semibold">{m.label}</span>
              <span className="text-[11px] text-shell-muted">{m.hint}</span>
            </button>
          );
        })}
      </div>

      {pendingMode && safeMode && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/40 bg-amber-950/40 p-3">
          <p className="flex-1 text-sm text-amber-100">
            Confirm mode change to <strong>{pendingMode}</strong>?
          </p>
          <button
            type="button"
            onClick={confirmPendingMode}
            className="shell-btn shell-btn-primary min-h-12 min-w-[7rem] px-4"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={cancelPendingMode}
            className="shell-btn shell-btn-secondary min-h-12 px-4"
          >
            Cancel
          </button>
        </div>
      )}
    </section>
  );
}
