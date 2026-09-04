"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShellStore } from "@/lib/store";
import type { ShellMode } from "@/lib/intents/types";
import { cn } from "@/lib/utils";

type StepId =
  | "intro"
  | "safe"
  | "confidence"
  | "dwell"
  | "switch"
  | "practice"
  | "review";

const STEPS: { id: StepId; title: string }[] = [
  { id: "intro", title: "Intro" },
  { id: "safe", title: "Safe mode" },
  { id: "confidence", title: "Confidence" },
  { id: "dwell", title: "Dwell" },
  { id: "switch", title: "Switch" },
  { id: "practice", title: "Practice" },
  { id: "review", title: "Save" },
];

export function CalibrationWizard() {
  const profile = useShellStore((s) => s.profile);
  const confidence = useShellStore((s) => s.confidence);
  const cursor = useShellStore((s) => s.cursor);
  const completeCalibration = useShellStore((s) => s.completeCalibration);
  const setCalibrating = useShellStore((s) => s.setCalibrating);
  const setModeImmediate = useShellStore((s) => s.setModeImmediate);
  const hydrate = useShellStore((s) => s.hydrate);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name);
  const [safeMode, setSafeMode] = useState(profile.safeMode);
  const [confidenceThreshold, setConfidenceThreshold] = useState(
    profile.confidenceThreshold
  );
  const [dwellMs, setDwellMs] = useState(profile.dwellMs);
  const [switchTimingMs, setSwitchTimingMs] = useState(profile.switchTimingMs);
  const [switchCount, setSwitchCount] = useState<2 | 3 | 4>(profile.switchCount);
  const [defaultMode, setDefaultMode] = useState<ShellMode>(profile.defaultMode);
  const [practiceDone, setPracticeDone] = useState(false);
  const [dwellProgress, setDwellProgress] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    hydrate();
    setCalibrating(true);
    return () => setCalibrating(false);
  }, [hydrate, setCalibrating]);

  // Sync initial profile after hydrate
  useEffect(() => {
    setName(profile.name);
    setSafeMode(profile.safeMode);
    setConfidenceThreshold(profile.confidenceThreshold);
    setDwellMs(profile.dwellMs);
    setSwitchTimingMs(profile.switchTimingMs);
    setSwitchCount(profile.switchCount);
    setDefaultMode(profile.defaultMode);
  }, [profile.name]); // only first meaningful hydrate

  const current = STEPS[step];
  const atTarget = useMemo(() => {
    // Practice target center-ish top-left quadrant
    const tx = 0.28;
    const ty = 0.32;
    const dist = Math.hypot(cursor.x - tx, cursor.y - ty);
    return dist < 0.12;
  }, [cursor]);

  // Dwell practice progress
  useEffect(() => {
    if (current?.id !== "practice" || practiceDone) return;
    setModeImmediate("point", false);
    if (!atTarget) {
      setDwellProgress(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / dwellMs);
      setDwellProgress(p);
      if (p >= 1) {
        setPracticeDone(true);
        window.clearInterval(id);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [current?.id, atTarget, dwellMs, practiceDone, setModeImmediate]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const save = () => {
    completeCalibration({
      name: name.trim() || "Default",
      safeMode,
      confidenceThreshold,
      dwellMs,
      switchTimingMs,
      switchCount,
      defaultMode,
    });
    setSaved(true);
  };

  const confPct = Math.round(confidenceThreshold * 100);
  const livePct = Math.round(confidence * 100);
  const above = confidence >= confidenceThreshold;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Calibration</h1>
        <p className="mt-1 text-sm text-shell-muted">
          Set Safe mode, confidence threshold, dwell, and switch timing. Saved locally into your
          profile — no cloud, no neural data upload. ARM still requires a gym slice after this
          wizard.
        </p>
      </div>

      {/* Step rail */}
      <ol className="flex flex-wrap gap-1.5" aria-label="Calibration steps">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                i === step
                  ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-400/50"
                  : i < step
                    ? "bg-emerald-500/15 text-emerald-200"
                    : "bg-shell-panel text-shell-muted"
              )}
            >
              {i + 1}. {s.title}
            </button>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border border-shell-border bg-shell-panel p-5 sm:p-6">
        {current.id === "intro" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Welcome</h2>
            <p className="text-sm text-shell-muted leading-relaxed">
              This wizard tunes how NeuraShell interprets intent for <strong>you</strong>. Values
              map to Neurabridge-friendly profile fields (
              <code className="text-cyan-300">dwellMs</code>,{" "}
              <code className="text-cyan-300">confidenceThreshold</code>,{" "}
              <code className="text-cyan-300">switchTimingMs</code>).
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-shell-fg/90">
              <li>Keyboard / synthetic intents work during practice</li>
              <li>STOP / HOLD still available in the panic bar</li>
              <li>~2 minutes · skip any step with Next</li>
            </ul>
            <label className="block text-sm">
              <span className="text-shell-muted">Profile name</span>
              <input
                className="shell-input mt-1 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
              />
            </label>
          </div>
        )}

        {current.id === "safe" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Safe mode default</h2>
            <p className="text-sm text-shell-muted">
              When ON: larger targets, higher effective confirm threshold, slower scan, mode changes
              require Confirm.
            </p>
            <button
              type="button"
              role="switch"
              aria-checked={safeMode}
              onClick={() => setSafeMode(!safeMode)}
              className={cn(
                "shell-btn min-h-14 w-full px-5 text-base font-bold",
                safeMode
                  ? "border-amber-400/60 bg-amber-500/20 text-amber-50"
                  : "border-shell-border bg-shell-bg text-shell-muted"
              )}
            >
              Safe mode: {safeMode ? "ON (recommended)" : "OFF"}
            </button>
            <label className="block text-sm">
              <span className="text-shell-muted">Default mode after load</span>
              <select
                className="shell-input mt-1 w-full"
                value={defaultMode}
                onChange={(e) => setDefaultMode(e.target.value as ShellMode)}
              >
                {(["idle", "point", "click", "type", "switch"] as ShellMode[]).map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        {current.id === "confidence" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Confidence threshold</h2>
            <p className="text-sm text-shell-muted">
              Discrete confirms (click / select) only fire when confidence ≥ threshold
              {safeMode ? " (Safe mode adds ~5% headroom at runtime)" : ""}.
            </p>
            <div className="flex items-end justify-between gap-3">
              <span className="text-3xl font-bold tabular-nums text-cyan-300">{confPct}%</span>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  above ? "bg-emerald-500/20 text-emerald-200" : "bg-zinc-700 text-zinc-300"
                )}
              >
                Live {livePct}% {above ? "≥ threshold" : "< threshold"}
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={0.95}
              step={0.05}
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Confidence threshold"
            />
            <div className="flex justify-between text-xs text-shell-muted">
              <span>More accepts (0.3)</span>
              <span>Stricter (0.95)</span>
            </div>
            <p className="text-xs text-shell-muted">
              Move with WASD/arrows or run synthetic session to sample live confidence.
            </p>
          </div>
        )}

        {current.id === "dwell" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Dwell time</h2>
            <p className="text-sm text-shell-muted">
              How long to stay on a target before select (used in practice + future dwell-select).
            </p>
            <p className="text-3xl font-bold tabular-nums text-cyan-300">{dwellMs} ms</p>
            <input
              type="range"
              min={200}
              max={2000}
              step={50}
              value={dwellMs}
              onChange={(e) => setDwellMs(Number(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Dwell milliseconds"
            />
            <div className="flex flex-wrap gap-2">
              {[400, 600, 900, 1200].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDwellMs(v)}
                  className={cn(
                    "shell-btn min-h-11 px-3 text-sm",
                    dwellMs === v ? "shell-btn-primary" : "shell-btn-secondary"
                  )}
                >
                  {v}ms
                </button>
              ))}
            </div>
          </div>
        )}

        {current.id === "switch" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Switch scan</h2>
            <p className="text-sm text-shell-muted">
              Scan period and option count for switch mode (Safe mode multiplies period by ~1.25× at
              runtime).
            </p>
            <p className="text-3xl font-bold tabular-nums text-cyan-300">{switchTimingMs} ms</p>
            <input
              type="range"
              min={300}
              max={2000}
              step={50}
              value={switchTimingMs}
              onChange={(e) => setSwitchTimingMs(Number(e.target.value))}
              className="w-full accent-cyan-400"
              aria-label="Switch timing milliseconds"
            />
            <div className="flex gap-2" role="group" aria-label="Switch count">
              {([2, 3, 4] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSwitchCount(n)}
                  className={cn(
                    "shell-btn min-h-12 flex-1",
                    switchCount === n ? "shell-btn-primary" : "shell-btn-secondary"
                  )}
                >
                  {n} options
                </button>
              ))}
            </div>
          </div>
        )}

        {current.id === "practice" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Dwell practice</h2>
            <p className="text-sm text-shell-muted">
              Move the soft cursor (WASD / arrows) onto the target and hold for {dwellMs}ms. Optional
              — skip if needed.
            </p>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-shell-border bg-gradient-to-br from-zinc-950 to-zinc-900">
              <div
                className={cn(
                  "absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 text-sm font-bold",
                  practiceDone
                    ? "border-emerald-400 bg-emerald-500/30 text-emerald-50"
                    : atTarget
                      ? "border-cyan-300 bg-cyan-500/25 text-cyan-50"
                      : "border-zinc-600 bg-zinc-800 text-zinc-300"
                )}
                style={{ left: "28%", top: "32%" }}
              >
                {practiceDone ? "OK" : "Target"}
              </div>
              <div
                className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400/80"
                style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                aria-hidden
              />
              <div className="absolute right-3 bottom-3 left-3 h-2 overflow-hidden rounded-full bg-shell-bg">
                <div
                  className="h-full bg-cyan-400 transition-[width]"
                  style={{ width: `${Math.round(dwellProgress * 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm" role="status">
              {practiceDone
                ? "Practice complete — dwell registered."
                : atTarget
                  ? "Holding… keep cursor on target."
                  : "Move cursor onto the target."}
            </p>
          </div>
        )}

        {current.id === "review" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Review & save</h2>
            {saved ? (
              <div className="space-y-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
                <p className="font-semibold text-emerald-100">Calibration saved locally.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/gym" className="shell-btn shell-btn-primary min-h-12 px-4 no-underline">
                    Continue to gym
                  </Link>
                  <Link href="/" className="shell-btn shell-btn-secondary min-h-12 px-4 no-underline">
                    Back to shell
                  </Link>
                  <button
                    type="button"
                    className="shell-btn shell-btn-secondary min-h-12 px-4"
                    onClick={() => {
                      setSaved(false);
                      setStep(0);
                      setPracticeDone(false);
                    }}
                  >
                    Run again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    ["Name", name],
                    ["Safe mode", safeMode ? "ON" : "OFF"],
                    ["Confidence", `${confPct}%`],
                    ["Dwell", `${dwellMs} ms`],
                    ["Switch timing", `${switchTimingMs} ms`],
                    ["Switch count", String(switchCount)],
                    ["Default mode", defaultMode],
                    ["Practice", practiceDone ? "Done" : "Skipped"],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="rounded-lg border border-shell-border bg-shell-bg px-3 py-2"
                    >
                      <dt className="text-xs text-shell-muted">{k}</dt>
                      <dd className="font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={save}
                  className="shell-btn shell-btn-primary min-h-14 w-full px-5 text-base font-bold"
                >
                  Save to local profile
                </button>
              </>
            )}
          </div>
        )}

        {!saved && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-shell-border pt-4">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="shell-btn shell-btn-secondary min-h-12 px-5"
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="shell-btn shell-btn-primary min-h-12 min-w-[8rem] px-5 sm:ml-auto"
              >
                Next
              </button>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
