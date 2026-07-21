"use client";

import { useEffect } from "react";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const LABELS = ["Option A", "Option B", "Option C", "Option D"];

export function SwitchScan() {
  const mode = useShellStore((s) => s.mode);
  const switchIndex = useShellStore((s) => s.switchIndex);
  const setSwitchIndex = useShellStore((s) => s.setSwitchIndex);
  const switchCount = useShellStore((s) => s.profile.switchCount);
  const switchTimingMs = useShellStore((s) => s.profile.switchTimingMs);
  const safeMode = useShellStore((s) => s.safeMode);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const setClickTarget = useShellStore((s) => s.setClickTarget);

  const count = Math.min(switchCount, LABELS.length);
  const period = safeMode ? switchTimingMs * 1.25 : switchTimingMs;

  useEffect(() => {
    if (mode !== "switch" || hold || frozen) return;
    const id = setInterval(() => {
      const cur = useShellStore.getState().switchIndex;
      setSwitchIndex((cur + 1) % count);
    }, period);
    return () => clearInterval(id);
  }, [mode, hold, frozen, period, count, setSwitchIndex]);

  const items = LABELS.slice(0, count);

  return (
    <div
      className={cn(
        "rounded-xl border border-shell-border bg-shell-panel p-4",
        mode !== "switch" && "opacity-60"
      )}
      aria-label="Switch scan board"
    >
      <p className="mb-3 text-xs text-shell-muted">
        Switch scan · keys 1–{count} or auto-highlight · Enter to select
      </p>
      <div className={cn("grid gap-2", count === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {items.map((label, i) => {
          const on = switchIndex % count === i;
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                setSwitchIndex(i);
                setClickTarget(`switch-${i}`);
              }}
              className={cn(
                "shell-btn min-h-14 px-3 text-sm font-semibold",
                on
                  ? "border-violet-400 bg-violet-500/25 text-violet-50 ring-2 ring-violet-400/40"
                  : "border-shell-border bg-shell-bg"
              )}
              aria-current={on ? "true" : undefined}
            >
              <span className="mr-2 font-mono text-shell-muted">{i + 1}</span>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
