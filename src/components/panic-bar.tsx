"use client";

import { useEffect } from "react";
import { useShellStore } from "@/lib/store";
import { formatUndoTime, undoTimeline, withUndoTimestamps } from "@/lib/undo-timeline";
import { cn } from "@/lib/utils";

export function PanicBar() {
  const panicStop = useShellStore((s) => s.panicStop);
  const panicHold = useShellStore((s) => s.panicHold);
  const releaseHold = useShellStore((s) => s.releaseHold);
  const undo = useShellStore((s) => s.undo);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);
  const freezeReason = useShellStore((s) => s.freezeReason);
  const confirmPendingMode = useShellStore((s) => s.confirmPendingMode);
  const pendingMode = useShellStore((s) => s.pendingMode);
  const undoStack = useShellStore((s) => s.undoStack);

  useEffect(() => {
    const stack = useShellStore.getState().undoStack;
    const stamped = withUndoTimestamps(stack);
    if (stamped !== stack) useShellStore.setState({ undoStack: stamped });
  }, [undoStack]);

  const rows = undoTimeline(undoStack);
  const locked = hold || frozen;
  const isStop = freezeReason === "stop" || (frozen && !hold);

  return (
    <div
      className={cn(
        "sticky top-0 z-50 border-b bg-shell-bg/95 backdrop-blur-md",
        locked
          ? isStop
            ? "border-red-500/80"
            : "border-amber-400/70"
          : "border-red-900/60"
      )}
    >
      <div
        role="toolbar"
        aria-label="Panic controls"
        className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-stretch gap-2 px-3 py-2 sm:gap-3 sm:px-4"
      >
        {locked && (
          <div
            className={cn(
              "flex min-h-12 items-center rounded-xl px-3 text-xs font-bold tracking-wide uppercase sm:text-sm",
              isStop
                ? "bg-red-600/90 text-white"
                : "bg-amber-500/90 text-black"
            )}
            role="status"
            aria-live="assertive"
          >
            {isStop ? "FROZEN · STOP" : "FROZEN · HOLD"}
          </div>
        )}
        <button
          type="button"
          onClick={panicStop}
          className={cn(
            "shell-btn min-h-12 flex-1 basis-[28%] border-red-500 bg-red-600 px-4 text-base font-bold tracking-wide text-white",
            "hover:bg-red-500 focus-visible:ring-red-300 sm:flex-none sm:min-w-[7.5rem]"
          )}
          title="Esc — cancel pending, freeze, mode → idle"
        >
          STOP
        </button>
        <button
          type="button"
          onClick={undo}
          className="shell-btn shell-btn-secondary min-h-12 flex-1 basis-[28%] px-4 text-base font-bold sm:flex-none sm:min-w-[7.5rem]"
          title="⌘Z / Ctrl+Z — undo the newest shell action"
        >
          UNDO
        </button>
        <button
          type="button"
          onClick={() => {
            if (locked) releaseHold();
            else panicHold();
          }}
          className={cn(
            "shell-btn min-h-12 flex-1 basis-[28%] px-4 text-base font-bold sm:flex-none sm:min-w-[7.5rem]",
            locked
              ? "border-amber-300 bg-amber-400 text-black ring-2 ring-amber-200/50"
              : "border-shell-border bg-shell-panel text-shell-fg"
          )}
          title="Temporary freeze until confirm"
          aria-pressed={locked}
        >
          {locked ? "RELEASE" : "HOLD"}
        </button>
        {(pendingMode || locked) && (
          <button
            type="button"
            onClick={() => {
              if (locked) releaseHold();
              else if (pendingMode) confirmPendingMode();
            }}
            className="shell-btn shell-btn-primary min-h-12 px-4 text-sm font-semibold sm:ml-auto"
            title="Space — confirm / release"
          >
            {locked ? "Confirm release" : "Confirm (Space)"}
          </button>
        )}
      </div>
      <div className="mx-auto max-w-6xl px-3 pb-2 sm:px-4">
        <p
          id="undo-timeline-label"
          className="text-xs font-semibold tracking-wide text-shell-muted uppercase"
        >
          Undo timeline · newest first
        </p>
        {rows.length === 0 ? (
          <p className="mt-1 text-sm text-shell-muted">There is nothing to undo.</p>
        ) : (
          <ol
            aria-labelledby="undo-timeline-label"
            className="mt-1 max-h-36 space-y-1 overflow-y-auto"
          >
            {rows.map((row) => (
              <li key={`${row.stackIndex}-${row.at}`}>
                {row.newest ? (
                  <button
                    type="button"
                    onClick={undo}
                    className="shell-btn shell-btn-secondary min-h-12 w-full justify-between gap-3 px-3 text-left text-sm font-semibold"
                    title="Undo this entry. Older rows stay put until they are newest."
                  >
                    <span>{row.label}</span>
                    <time
                      dateTime={new Date(row.at).toISOString()}
                      className="shrink-0 font-mono text-xs font-normal text-shell-muted"
                    >
                      {formatUndoTime(row.at)}
                    </time>
                  </button>
                ) : (
                  <div
                    className="flex min-h-10 items-center justify-between gap-3 rounded-lg px-3 text-sm text-shell-muted"
                    title="Undo pops the newest entry only."
                  >
                    <span>{row.label}</span>
                    <time
                      dateTime={new Date(row.at).toISOString()}
                      className="shrink-0 font-mono text-xs"
                    >
                      {formatUndoTime(row.at)}
                    </time>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
