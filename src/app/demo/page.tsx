"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IntentHost, type IntentSessionApi } from "@/components/intent-host";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PanicBar } from "@/components/panic-bar";
import { FreezeOverlay } from "@/components/freeze-overlay";
import { ShellNav } from "@/components/shell-nav";
import { SessionReady } from "@/components/session-ready";
import { ModeSwitcher } from "@/components/mode-switcher";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { PointCanvas } from "@/components/point-canvas";
import { ProfilePanel } from "@/components/profile-panel";
import { useShellStore } from "@/lib/store";
import { downloadProfile } from "@/lib/profiles/storage";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  title: string;
  detail: string;
  run: (api: IntentSessionApi) => void | Promise<void>;
  durationMs: number;
};

const STEPS: Step[] = [
  {
    id: "connect",
    title: "Connect synthetic",
    detail: "Start a zero-hardware synthetic intent session.",
    durationMs: 5000,
    run: (api) => api.startSynthetic(),
  },
  {
    id: "safe-arm",
    title: "Safe + ARM",
    detail: "Safe mode ON, then ARM when readiness allows.",
    durationMs: 6000,
    run: () => {
      const s = useShellStore.getState();
      s.setSafeMode(true);
      s.releaseHold();
      // synthetic will raise readiness; force-arm after session is up
      const ok = s.arm();
      s.setStatus(
        ok
          ? "Demo: ARMED — actuation enabled."
          : "Demo: arm attempted (need session + not frozen)."
      );
      // Retry arm shortly once intents flow
      setTimeout(() => useShellStore.getState().arm(), 400);
    },
  },
  {
    id: "record",
    title: "Record intents",
    detail: "Local capture of the synthetic stream.",
    durationMs: 5000,
    run: () => {
      useShellStore.getState().startRecording();
    },
  },
  {
    id: "mode-point",
    title: "Mode → point",
    detail: "Request point mode (confirm if Safe).",
    durationMs: 6000,
    run: () => {
      const s = useShellStore.getState();
      s.requestMode("point");
      if (s.safeMode) {
        setTimeout(() => useShellStore.getState().confirmPendingMode(), 800);
      }
    },
  },
  {
    id: "mode-switch",
    title: "Mode → switch",
    detail: "Switch scan highlight for 2–4 options.",
    durationMs: 5000,
    run: () => {
      const s = useShellStore.getState();
      s.requestMode("switch");
      setTimeout(() => useShellStore.getState().confirmPendingMode(), 800);
    },
  },
  {
    id: "stop-record",
    title: "Stop record + STOP",
    detail: "End capture, panic STOP (disarms + freezes).",
    durationMs: 6000,
    run: () => {
      useShellStore.getState().stopRecording();
      useShellStore.getState().panicStop();
    },
  },
  {
    id: "export",
    title: "Export profile",
    detail: "Download local JSON profile (NeuralBridge-friendly fields).",
    durationMs: 5000,
    run: () => {
      const profile = useShellStore.getState().profile;
      downloadProfile(profile, "neurashell-demo-profile.json");
      useShellStore.getState().setStatus("Demo: profile exported.");
      useShellStore.getState().releaseHold();
    },
  },
];

export default function DemoPage() {
  const apiRef = useRef<IntentSessionApi | null>(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timers = useRef<number[]>([]);
  const statusMessage = useShellStore((s) => s.statusMessage);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const autoStarted = useRef(false);

  const stopTour = useCallback(() => {
    clearTimers();
    setRunning(false);
  }, []);

  const startTour = useCallback(() => {
    const api = apiRef.current;
    if (!api) {
      useShellStore.getState().setStatus("Adapters not ready — wait a moment and retry.");
      return;
    }
    clearTimers();
    setDone(false);
    setRunning(true);
    setStepIndex(0);

    let elapsed = 0;
    STEPS.forEach((step, i) => {
      const t = window.setTimeout(() => {
        setStepIndex(i);
        void step.run(api);
        if (i === STEPS.length - 1) {
          const end = window.setTimeout(() => {
            setRunning(false);
            setDone(true);
            useShellStore.getState().setStatus("Demo complete — keyboard path still active.");
          }, step.durationMs);
          timers.current.push(end);
        }
      }, elapsed);
      timers.current.push(t);
      elapsed += step.durationMs;
    });
  }, []);

  const onAdaptersReady = useCallback(
    (api: IntentSessionApi) => {
      apiRef.current = api;
      if (!autoStarted.current) {
        autoStarted.current = true;
        window.setTimeout(() => startTour(), 400);
      }
    },
    [startTour]
  );

  useEffect(() => () => clearTimers(), []);

  const progress =
    stepIndex < 0 ? 0 : Math.round(((stepIndex + (done ? 1 : 0)) / STEPS.length) * 100);

  return (
    <div className="flex min-h-full flex-col">
      <IntentHost onAdaptersReady={onAdaptersReady} />
      <DisclaimerBanner />
      <PanicBar />
      <FreezeOverlay />
      <ShellNav active="/demo" />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 py-4 sm:px-4 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Demo tour (~40s)
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-shell-muted">
              No account. Scripted path: synthetic → ARM → record → modes → STOP → export
              profile. Keyboard works the whole time (Esc STOP, ⌘Z UNDO).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startTour}
              className="shell-btn shell-btn-primary min-h-12 px-5"
              disabled={running}
            >
              {running ? "Tour running…" : done ? "Replay tour" : "Start tour"}
            </button>
            <button
              type="button"
              onClick={stopTour}
              className="shell-btn shell-btn-secondary min-h-12 px-4"
              disabled={!running}
            >
              Pause tour
            </button>
            <Link href="/" className="shell-btn shell-btn-ghost min-h-12 px-4 no-underline">
              Full shell
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-shell-border bg-shell-panel p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-shell-muted">Progress</span>
            <span className="font-mono text-cyan-300">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-shell-bg">
            <div
              className="h-full bg-cyan-500 transition-[width] duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm",
                  i === stepIndex && running
                    ? "border-cyan-400/60 bg-cyan-500/10"
                    : i < stepIndex || done
                      ? "border-emerald-800/50 bg-emerald-950/20"
                      : "border-shell-border bg-shell-bg"
                )}
              >
                <span className="font-mono text-xs text-shell-muted">{i + 1}.</span>{" "}
                <span className="font-semibold">{s.title}</span>
                <p className="mt-0.5 text-xs text-shell-muted">{s.detail}</p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-shell-fg/90" role="status" aria-live="polite">
            {statusMessage}
          </p>
        </div>

        <SessionReady
          onStartSynthetic={() => apiRef.current?.startSynthetic()}
          onStopSession={() => apiRef.current?.stopSession()}
        />
        <ModeSwitcher />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PointCanvas />
          </div>
          <div className="space-y-4">
            <ConfidenceMeter />
            <ProfilePanel compact />
          </div>
        </div>
      </main>
    </div>
  );
}
