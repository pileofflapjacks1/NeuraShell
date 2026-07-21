"use client";

import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const TARGETS = [
  { id: "target-TL", label: "TL", x: 0.22, y: 0.22 },
  { id: "target-TR", label: "TR", x: 0.78, y: 0.22 },
  { id: "target-BL", label: "BL", x: 0.22, y: 0.78 },
  { id: "target-BR", label: "BR", x: 0.78, y: 0.78 },
];

export function PointCanvas() {
  const cursor = useShellStore((s) => s.cursor);
  const mode = useShellStore((s) => s.mode);
  const clickTargetId = useShellStore((s) => s.clickTargetId);
  const safeMode = useShellStore((s) => s.safeMode);
  const active = mode === "point" || mode === "click";

  return (
    <div
      className={cn(
        "relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-shell-border bg-gradient-to-br from-zinc-950 to-zinc-900",
        !active && "opacity-60"
      )}
      aria-label="In-shell point / click canvas"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.06),transparent_55%)]" />
      <p className="absolute top-2 left-3 text-xs text-shell-muted">
        Soft cursor preview {active ? `(${mode})` : "(inactive)"} · not OS hijack
      </p>

      {TARGETS.map((t) => {
        const selected = clickTargetId === t.id;
        const size = safeMode ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14";
        return (
          <div
            key={t.id}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 font-semibold transition-colors",
              size,
              selected
                ? "border-cyan-300 bg-cyan-500/30 text-cyan-50 ring-2 ring-cyan-400/50"
                : "border-zinc-600 bg-zinc-800/80 text-zinc-300"
            )}
            style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%` }}
          >
            {t.label}
          </div>
        );
      })}

      <div
        className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400/80 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
        style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
        aria-hidden
      />
    </div>
  );
}
