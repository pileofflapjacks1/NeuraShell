"use client";

import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const KEYS = [
  "a",
  "e",
  "i",
  "o",
  "u",
  "n",
  "t",
  "s",
  " ",
  "⌫",
];

export function TypeBoard() {
  const mode = useShellStore((s) => s.mode);
  const typed = useShellStore((s) => s.typed);
  const appendTyped = useShellStore((s) => s.appendTyped);
  const backspaceTyped = useShellStore((s) => s.backspaceTyped);
  const switchIndex = useShellStore((s) => s.switchIndex);
  const safeMode = useShellStore((s) => s.safeMode);
  const setSwitchIndex = useShellStore((s) => s.setSwitchIndex);

  const onKey = (k: string) => {
    if (k === "⌫") backspaceTyped();
    else appendTyped(k === " " ? " " : k);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-shell-border bg-shell-panel p-4",
        mode !== "type" && "opacity-60"
      )}
      aria-label="Minimal type board"
    >
      <p className="mb-2 text-xs text-shell-muted">
        Type board · highlight with 1–0 / scan · click or confirm to insert
      </p>
      <div
        className="mb-3 min-h-12 rounded-lg border border-shell-border bg-shell-bg px-3 py-2 font-mono text-lg text-shell-fg"
        aria-live="polite"
      >
        {typed || <span className="text-shell-muted">…</span>}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {KEYS.map((k, i) => {
          const on = mode === "type" && switchIndex % KEYS.length === i;
          return (
            <button
              key={`${k}-${i}`}
              type="button"
              onClick={() => {
                setSwitchIndex(i);
                onKey(k);
              }}
              className={cn(
                "shell-btn min-h-12 font-mono text-base font-semibold",
                safeMode && "min-h-14",
                on
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-50"
                  : "border-shell-border bg-shell-bg"
              )}
            >
              {k === " " ? "␣" : k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
