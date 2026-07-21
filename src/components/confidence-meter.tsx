"use client";

import { useShellStore } from "@/lib/store";
import { formatConfidence } from "@/lib/utils";

export function ConfidenceMeter() {
  const confidence = useShellStore((s) => s.confidence);
  const threshold = useShellStore((s) => s.profile.confidenceThreshold);
  const pct = Math.round(confidence * 100);
  const thrPct = Math.round(threshold * 100);

  return (
    <div className="rounded-xl border border-shell-border bg-shell-panel p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-shell-muted uppercase">
          Confidence
        </h2>
        <span className="font-mono text-lg font-bold text-shell-fg tabular-nums">
          {formatConfidence(confidence)}
        </span>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-shell-bg"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Signal confidence"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-700 to-cyan-400 transition-[width] duration-150"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-400"
          style={{ left: `${thrPct}%` }}
          title={`Threshold ${thrPct}%`}
        />
      </div>
      <p className="mt-2 text-xs text-shell-muted">
        Threshold {thrPct}% · placeholder from sim / last intent
      </p>
    </div>
  );
}
