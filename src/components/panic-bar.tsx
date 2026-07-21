"use client";

import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PanicBar() {
  const panicStop = useShellStore((s) => s.panicStop);
  const panicHold = useShellStore((s) => s.panicHold);
  const releaseHold = useShellStore((s) => s.releaseHold);
  const undo = useShellStore((s) => s.undo);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const confirmPendingMode = useShellStore((s) => s.confirmPendingMode);
  const pendingMode = useShellStore((s) => s.pendingMode);

  return (
    <div
      role="toolbar"
      aria-label="Panic controls"
      className="sticky top-0 z-50 border-b border-red-900/60 bg-shell-bg/95 backdrop-blur-md"
    >
      <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-stretch gap-2 px-3 py-2 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={panicStop}
          className={cn(
            "shell-btn min-h-12 flex-1 basis-[30%] border-red-500 bg-red-600 px-4 text-base font-bold tracking-wide text-white",
            "hover:bg-red-500 focus-visible:ring-red-300 sm:flex-none sm:min-w-[8rem]"
          )}
          title="Esc — cancel pending, freeze, mode → idle"
        >
          STOP
        </button>
        <button
          type="button"
          onClick={undo}
          className="shell-btn shell-btn-secondary min-h-12 flex-1 basis-[30%] px-4 text-base font-bold sm:flex-none sm:min-w-[8rem]"
          title="⌘Z / Ctrl+Z — undo last shell action"
        >
          UNDO
        </button>
        <button
          type="button"
          onClick={() => {
            if (hold || frozen) releaseHold();
            else panicHold();
          }}
          className={cn(
            "shell-btn min-h-12 flex-1 basis-[30%] px-4 text-base font-bold sm:flex-none sm:min-w-[8rem]",
            hold || frozen
              ? "border-amber-400 bg-amber-500/25 text-amber-50"
              : "border-shell-border bg-shell-panel text-shell-fg"
          )}
          title="Temporary freeze until confirm"
          aria-pressed={hold || frozen}
        >
          {hold || frozen ? "RELEASE" : "HOLD"}
        </button>
        {(pendingMode || hold || frozen) && (
          <button
            type="button"
            onClick={() => {
              if (hold || frozen) releaseHold();
              else if (pendingMode) confirmPendingMode();
            }}
            className="shell-btn shell-btn-primary min-h-12 px-4 text-sm font-semibold sm:ml-auto"
            title="Space — confirm"
          >
            Confirm (Space)
          </button>
        )}
      </div>
    </div>
  );
}
