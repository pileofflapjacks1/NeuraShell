"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useShellStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  GYM_FAIL_MISS,
  GYM_FULL_SEC,
  GYM_REMAP_MISS,
  GYM_SLICE_SEC,
  GYM_TRIAL_COUNT,
  GYM_TRIAL_TIMEOUT_MS,
  missRate,
  scoreIntentTrial,
  scoreTrial,
  shouldOfferRemap,
  type TrialResult,
} from "@/lib/gym";
import {
  GESTURE_HINTS,
  nextClickGesture,
} from "@/lib/intents/mapping";
import type { GestureId } from "@/lib/intents/types";
import { gestureFromIntent } from "@/lib/intents/mapping";

type Phase = "intro" | "running" | "results" | "done";

const RESULT_LABEL: Record<TrialResult, string> = {
  hit: "hit",
  wrong: "wrong gesture",
  timeout: "timeout",
  low_confidence: "low confidence",
};

export function GymSession() {
  const profile = useShellStore((s) => s.profile);
  const lastIntent = useShellStore((s) => s.lastIntent);
  const cursor = useShellStore((s) => s.cursor);
  const hydrate = useShellStore((s) => s.hydrate);
  const setCalibrating = useShellStore((s) => s.setCalibrating);
  const setModeImmediate = useShellStore((s) => s.setModeImmediate);
  const completeGym = useShellStore((s) => s.completeGym);
  const applyIntent = useShellStore((s) => s.applyIntent);

  const [phase, setPhase] = useState<Phase>("intro");
  const [capSec, setCapSec] = useState<typeof GYM_SLICE_SEC | typeof GYM_FULL_SEC>(
    GYM_SLICE_SEC
  );
  const [trialIndex, setTrialIndex] = useState(0);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [deadline, setDeadline] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [dwellProgress, setDwellProgress] = useState(0);
  const [acceptedRemap, setAcceptedRemap] = useState(false);
  const processedT = useRef<number | null>(null);
  const busyRef = useRef(false);

  const expected: GestureId = profile.mappings.click;
  const alternate = nextClickGesture(expected);

  useEffect(() => {
    hydrate();
    setCalibrating(true);
    setModeImmediate("click", false);
    return () => setCalibrating(false);
  }, [hydrate, setCalibrating, setModeImmediate]);

  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  const finishGym = useCallback(
    (finalResults: TrialResult[], remap: boolean) => {
      const rate = missRate(finalResults);
      const from = useShellStore.getState().profile.mappings.click;
      const to = nextClickGesture(from);
      completeGym({
        missRate: rate,
        remap: remap
          ? {
              from,
              to,
              reason: `gym slice miss ${Math.round(rate * 100)}% > ${Math.round(GYM_REMAP_MISS * 100)}%`,
            }
          : undefined,
      });
      setAcceptedRemap(remap);
      setPhase("done");
    },
    [completeGym]
  );

  const recordResult = useCallback(
    (result: TrialResult) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setResults((prev) => {
        const next = [...prev, result];
        const elapsed = Date.now() - startedAt;
        const capHit = elapsed >= capSec * 1000;
        if (next.length >= GYM_TRIAL_COUNT || capHit) {
          const rate = missRate(next);
          if (shouldOfferRemap(rate)) {
            setPhase("results");
          } else {
            queueMicrotask(() => finishGym(next, false));
          }
        } else {
          setTrialIndex(next.length);
          setDeadline(Date.now() + GYM_TRIAL_TIMEOUT_MS);
          setDwellProgress(0);
          queueMicrotask(() => {
            busyRef.current = false;
          });
        }
        return next;
      });
    },
    [capSec, finishGym, startedAt]
  );

  // Discrete intent trials (and wrong-key during dwell)
  useEffect(() => {
    if (phase !== "running") return;
    if (!lastIntent) return;
    if (lastIntent.t === processedT.current) return;
    const observed = gestureFromIntent(lastIntent);
    if (observed == null) return;
    if (expected === "dwell" && observed === "dwell") return;
    processedT.current = lastIntent.t;
    const result = scoreIntentTrial(
      lastIntent,
      expected,
      profile.confidenceThreshold
    );
    recordResult(result);
  }, [expected, lastIntent, phase, profile.confidenceThreshold, recordResult]);

  // Timeout
  useEffect(() => {
    if (phase !== "running" || !deadline) return;
    if (now < deadline) return;
    recordResult("timeout");
  }, [deadline, now, phase, recordResult]);

  // Dwell trial: hold cursor on center target
  const atTarget = useMemo(() => {
    const dist = Math.hypot(cursor.x - 0.5, cursor.y - 0.5);
    return dist < 0.12;
  }, [cursor]);

  useEffect(() => {
    if (phase !== "running" || expected !== "dwell") return;
    if (!atTarget) {
      setDwellProgress(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / profile.dwellMs);
      setDwellProgress(p);
      if (p >= 1) {
        window.clearInterval(id);
        applyIntent({ type: "synthetic", name: "dwell", t: Date.now() });
        const result = scoreTrial({
          expected: "dwell",
          observed: "dwell",
          confidence: 1,
          threshold: profile.confidenceThreshold,
          timedOut: false,
        });
        recordResult(result);
      }
    }, 40);
    return () => window.clearInterval(id);
  }, [
    atTarget,
    applyIntent,
    expected,
    phase,
    profile.dwellMs,
    profile.confidenceThreshold,
    recordResult,
    trialIndex,
  ]);

  const start = () => {
    processedT.current = lastIntent?.t ?? null;
    busyRef.current = false;
    setResults([]);
    setTrialIndex(0);
    setAcceptedRemap(false);
    setStartedAt(Date.now());
    setDeadline(Date.now() + GYM_TRIAL_TIMEOUT_MS);
    setDwellProgress(0);
    setPhase("running");
  };

  const rate = missRate(results);
  const remainMs = Math.max(0, deadline - now);
  const capLeft = Math.max(0, capSec * 1000 - (now - startedAt));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          12-minute gym
        </h1>
        <p className="mt-1 text-sm text-shell-muted">
          Gym slice (honest default {GYM_SLICE_SEC / 60} min; optional full {GYM_FULL_SEC / 60}{" "}
          min). Remaps <strong>one</strong> action (click) onto a wizard gesture if miss rate is
          high. Local profile only — no cloud, no implant channels.
        </p>
      </div>

      <section className="rounded-xl border border-shell-border bg-shell-panel p-5 sm:p-6">
        {phase === "intro" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Click drill</h2>
            <p className="text-sm text-shell-muted leading-relaxed">
              {GYM_TRIAL_COUNT} trials of <strong>click</strong> using your current mapping{" "}
              <code className="text-cyan-300">{expected}</code> — {GESTURE_HINTS[expected]}. Wrong
              gesture, timeout, or low confidence counts as a miss. Nothing remaps unless you
              accept.
            </p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Gym duration">
              <button
                type="button"
                onClick={() => setCapSec(GYM_SLICE_SEC)}
                className={cn(
                  "shell-btn min-h-12 px-4",
                  capSec === GYM_SLICE_SEC ? "shell-btn-primary" : "shell-btn-secondary"
                )}
              >
                Slice {GYM_SLICE_SEC / 60} min
              </button>
              <button
                type="button"
                onClick={() => setCapSec(GYM_FULL_SEC)}
                className={cn(
                  "shell-btn min-h-12 px-4",
                  capSec === GYM_FULL_SEC ? "shell-btn-primary" : "shell-btn-secondary"
                )}
              >
                Full {GYM_FULL_SEC / 60} min cap
              </button>
            </div>
            <p className="text-xs text-shell-muted">
              Keyboard: Enter = confirm · K = key · 1–4 = switch · WASD = dwell cursor. Esc still
              STOP.
            </p>
            <button
              type="button"
              onClick={start}
              className="shell-btn shell-btn-primary min-h-14 w-full px-5 text-base font-bold"
            >
              Start gym slice
            </button>
            <Link href="/calibrate" className="block text-sm text-cyan-300 no-underline hover:underline">
              Need thresholds first? Open calibration wizard
            </Link>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-semibold">
                Trial {Math.min(trialIndex + 1, GYM_TRIAL_COUNT)} / {GYM_TRIAL_COUNT}
              </h2>
              <p className="font-mono text-sm text-cyan-300">
                {Math.ceil(remainMs / 1000)}s · cap {Math.ceil(capLeft / 1000)}s
              </p>
            </div>
            <p className="text-lg font-semibold text-shell-fg">
              Perform <span className="text-cyan-300">click</span> via{" "}
              <span className="text-cyan-300">{expected}</span>
            </p>
            <p className="text-sm text-shell-muted">{GESTURE_HINTS[expected]}</p>

            {expected === "dwell" && (
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-shell-border bg-gradient-to-br from-zinc-950 to-zinc-900">
                <div
                  className={cn(
                    "absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border-2 text-sm font-bold",
                    atTarget
                      ? "border-cyan-300 bg-cyan-500/25 text-cyan-50"
                      : "border-zinc-600 bg-zinc-800 text-zinc-300"
                  )}
                  style={{ left: "50%", top: "50%" }}
                >
                  Target
                </div>
                <div
                  className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400/80"
                  style={{ left: `${cursor.x * 100}%`, top: `${cursor.y * 100}%` }}
                  aria-hidden
                />
                <div className="absolute right-3 bottom-3 left-3 h-2 overflow-hidden rounded-full bg-shell-bg">
                  <div
                    className="h-full bg-cyan-400"
                    style={{ width: `${Math.round(dwellProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <ol className="flex flex-wrap gap-1.5" aria-label="Trial results">
              {results.map((r, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    r === "hit"
                      ? "bg-emerald-500/20 text-emerald-100"
                      : "bg-red-500/20 text-red-100"
                  )}
                >
                  {i + 1} {RESULT_LABEL[r]}
                </li>
              ))}
            </ol>
          </div>
        )}

        {phase === "results" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Remap offer</h2>
            <p className="text-sm text-shell-muted leading-relaxed">
              Miss rate{" "}
              <strong className="text-amber-200">{Math.round(rate * 100)}%</strong> (threshold{" "}
              {Math.round(GYM_REMAP_MISS * 100)}%). Suggested remap: click{" "}
              <code className="text-cyan-300">{expected}</code> →{" "}
              <code className="text-cyan-300">{alternate}</code> ({GESTURE_HINTS[alternate]}).
              Nothing is written until you accept. Fail-closed: miss &gt;{" "}
              {Math.round(GYM_FAIL_MISS * 100)}% still blocks ARM until a better gym.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => finishGym(results, true)}
                className="shell-btn shell-btn-primary min-h-14 px-5 font-bold"
              >
                Accept remap click → {alternate}
              </button>
              <button
                type="button"
                onClick={() => finishGym(results, false)}
                className="shell-btn shell-btn-secondary min-h-14 px-5"
              >
                Keep {expected}
              </button>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3 rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
            <p className="font-semibold text-emerald-100">Gym slice saved locally.</p>
            <p className="text-sm text-shell-muted">
              Miss {Math.round((profile.lastGymMissRate ?? rate) * 100)}%.
              {acceptedRemap || profile.gymRemap
                ? ` Click now maps to ${profile.mappings.click}.`
                : " Mapping unchanged."}{" "}
              Next session uses this mapping in the OS dry-run preview.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="shell-btn shell-btn-primary min-h-12 px-4 no-underline">
                Back to shell — ARM
              </Link>
              <button
                type="button"
                className="shell-btn shell-btn-secondary min-h-12 px-4"
                onClick={() => {
                  setPhase("intro");
                  setResults([]);
                }}
              >
                Run again
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
