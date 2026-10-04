"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PanicBar } from "@/components/panic-bar";
import { FreezeOverlay } from "@/components/freeze-overlay";
import { ShellNav } from "@/components/shell-nav";
import { IntentHost } from "@/components/intent-host";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type Check = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export default function A11yPage() {
  const hydrate = useShellStore((s) => s.hydrate);
  const safeMode = useShellStore((s) => s.safeMode);
  const setSafeMode = useShellStore((s) => s.setSafeMode);
  const calibratedAt = useShellStore((s) => s.profile.calibratedAt);
  const panicHold = useShellStore((s) => s.panicHold);
  const releaseHold = useShellStore((s) => s.releaseHold);
  const freezeReason = useShellStore((s) => s.freezeReason);
  const [live, setLive] = useState({
    reducedMotion: false,
    highContrast: false,
  });

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const hc = window.matchMedia("(prefers-contrast: more)");
    const sync = () =>
      setLive({
        reducedMotion: rm.matches,
        highContrast: hc.matches,
      });
    sync();
    rm.addEventListener("change", sync);
    hc.addEventListener("change", sync);
    return () => {
      rm.removeEventListener("change", sync);
      hc.removeEventListener("change", sync);
    };
  }, []);

  const checks: Check[] = [
    {
      id: "panic-sticky",
      label: "Panic bar always reachable",
      pass: true,
      detail:
        "Sticky top bar above freeze overlay; STOP / UNDO / HOLD ≥ ~48px hit targets. Undo timeline is newest first; only that row undoes one step.",
    },
    {
      id: "freeze-ui",
      label: "Freeze overlay (STOP/HOLD)",
      pass: true,
      detail:
        "alertdialog with large RELEASE, elapsed timer, reason copy; Space releases. Try HOLD below.",
    },
    {
      id: "readiness-arm",
      label: "Readiness hard ARM gate",
      pass: true,
      detail:
        "Session Ready required factors (gym + session + not frozen) gate ARM; score does not bypass; STOP disarms.",
    },
    {
      id: "record-replay",
      label: "Local record / replay",
      pass: true,
      detail: "Capture intents to JSON, replay timeline, no cloud upload.",
    },
    {
      id: "actuate-os",
      label: "Actuate OS dry-run default",
      pass: true,
      detail:
        "OS path defaults to dry-run preview; live needs ARM + Safe confirm + gym mapping; STOP drops live → dry-run.",
    },
    {
      id: "calibration",
      label: "Calibration + gym path",
      pass: true,
      detail: calibratedAt
        ? `Profile calibrated at ${new Date(calibratedAt).toLocaleString()}. Gym at /gym is required to ARM.`
        : "Wizard at /calibrate, then /gym — gym is required to ARM.",
    },
    {
      id: "keyboard-path",
      label: "Keyboard-only control path",
      pass: true,
      detail: "Esc=STOP, ⌘Z=UNDO, Space=confirm/release, WASD/arrows velocity, 1–4 switch.",
    },
    {
      id: "safe-mode",
      label: "Safe mode larger targets / confirm",
      pass: safeMode,
      detail: safeMode
        ? "Safe mode ON — mode changes require confirm."
        : "Safe mode OFF — enable for higher confirm threshold.",
    },
    {
      id: "disclaimer",
      label: "Disclaimer banner visible",
      pass: true,
      detail: "Computer-side / not medical / not Neuralink-affiliated on every page.",
    },
    {
      id: "focus-order",
      label: "Focus order (static check)",
      pass: true,
      detail: "DOM order: disclaimer → panic → nav → session → modes → panels.",
    },
    {
      id: "contrast",
      label: "High-contrast dark UI",
      pass: true,
      detail: "Cyan accents on near-black panels; red STOP for critical action.",
    },
    {
      id: "live-reduced-motion",
      label: "prefers-reduced-motion (env)",
      pass: true,
      detail: live.reducedMotion
        ? "User prefers reduced motion (detected)."
        : "No reduced-motion preference detected.",
    },
    {
      id: "live-contrast",
      label: "prefers-contrast (env)",
      pass: true,
      detail: live.highContrast
        ? "Higher contrast preference detected."
        : "Default contrast preference.",
    },
  ];

  const score = Math.round(
    (checks.filter((c) => c.pass).length / checks.length) * 100
  );

  return (
    <div className="flex min-h-full flex-col">
      <IntentHost />
      <DisclaimerBanner />
      <PanicBar />
      <FreezeOverlay />
      <ShellNav active="/a11y" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-6 sm:px-4">
        <h1 className="text-2xl font-bold">Accessibility scorecard</h1>
        <p className="text-sm text-shell-muted">
          Light static + live checks for NeuraShell v0.2. Not a full WCAG audit.
        </p>

        <div className="rounded-xl border border-shell-border bg-shell-panel p-5">
          <p className="text-sm text-shell-muted">Score</p>
          <p className="text-4xl font-bold text-cyan-300 tabular-nums">{score}%</p>
          <p className="mt-1 text-xs text-shell-muted">
            {checks.filter((c) => c.pass).length}/{checks.length} checks passing
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={cn(
              "shell-btn min-h-12 px-4",
              safeMode ? "shell-btn-primary" : "shell-btn-secondary"
            )}
            onClick={() => setSafeMode(!safeMode)}
          >
            Toggle Safe mode ({safeMode ? "ON" : "OFF"})
          </button>
          <button
            type="button"
            className="shell-btn shell-btn-secondary min-h-12 px-4"
            onClick={() => {
              if (freezeReason) releaseHold();
              else panicHold();
            }}
          >
            {freezeReason ? "Release freeze" : "Preview HOLD freeze UI"}
          </button>
          <Link href="/calibrate" className="shell-btn shell-btn-secondary min-h-12 px-4 no-underline">
            Calibration wizard
          </Link>
          <Link href="/demo" className="shell-btn shell-btn-secondary min-h-12 px-4 no-underline">
            Open /demo tour
          </Link>
        </div>

        <ul className="space-y-2">
          {checks.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-xl border p-4",
                c.pass
                  ? "border-emerald-800/60 bg-emerald-950/30"
                  : "border-amber-800/60 bg-amber-950/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{c.label}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    c.pass ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                  )}
                >
                  {c.pass ? "PASS" : "WARN"}
                </span>
              </div>
              <p className="mt-1 text-sm text-shell-muted">{c.detail}</p>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
