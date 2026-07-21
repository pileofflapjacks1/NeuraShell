"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { IntentHost, type IntentSessionApi } from "@/components/intent-host";
import { SessionReady } from "@/components/session-ready";
import { ModeSwitcher } from "@/components/mode-switcher";
import { PanicBar } from "@/components/panic-bar";
import { FreezeOverlay } from "@/components/freeze-overlay";
import { ConfidenceMeter } from "@/components/confidence-meter";
import { ProfilePanel } from "@/components/profile-panel";
import { PointCanvas } from "@/components/point-canvas";
import { SwitchScan } from "@/components/switch-scan";
import { TypeBoard } from "@/components/type-board";
import { RecordReplay } from "@/components/record-replay";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { ShellNav } from "@/components/shell-nav";
import { useShellStore } from "@/lib/store";

export function ShellApp({ navActive = "/" }: { navActive?: string }) {
  const apiRef = useRef<IntentSessionApi | null>(null);
  const [, bump] = useState(0);
  const calibratedAt = useShellStore((s) => s.profile.calibratedAt);
  const armed = useShellStore((s) => s.armed);

  const onAdaptersReady = useCallback((api: IntentSessionApi) => {
    apiRef.current = api;
    bump((n) => n + 1);
  }, []);

  return (
    <div className="flex min-h-full flex-col bg-shell-bg text-shell-fg">
      <IntentHost onAdaptersReady={onAdaptersReady} />
      <DisclaimerBanner />
      <PanicBar />
      <FreezeOverlay />
      <ShellNav active={navActive} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 py-4 sm:space-y-5 sm:px-4 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Control plane
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-shell-muted sm:text-base">
              Session readiness + ARM gate · panic freeze · calibration · local intent
              record/replay. Simulator-first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={
                armed
                  ? "inline-flex min-h-12 items-center rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3 text-sm font-bold text-emerald-100"
                  : "inline-flex min-h-12 items-center rounded-xl border border-shell-border bg-shell-panel px-3 text-sm font-bold text-shell-muted"
              }
            >
              {armed ? "ARMED" : "DISARMED"}
            </span>
            <Link
              href="/calibrate"
              className="shell-btn shell-btn-primary min-h-12 px-4 no-underline text-sm"
            >
              {calibratedAt ? "Recalibrate" : "Calibrate"}
            </Link>
          </div>
        </div>

        {!calibratedAt && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-50">
            No calibration on this profile yet.{" "}
            <Link href="/calibrate" className="font-semibold underline-offset-2 hover:underline">
              Run the wizard
            </Link>{" "}
            to set dwell, confidence threshold, and Safe defaults.
          </div>
        )}

        <SessionReady
          onStartSynthetic={() => apiRef.current?.startSynthetic()}
          onStopSession={() => apiRef.current?.stopSession()}
          onTryBridge={() => apiRef.current?.startBridgeRemote()}
        />

        <ModeSwitcher />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <PointCanvas />
            <div className="grid gap-4 sm:grid-cols-2">
              <SwitchScan />
              <TypeBoard />
            </div>
            <RecordReplay
              onStartReplay={(rec) => apiRef.current?.startReplay(rec)}
              onStopReplay={() => apiRef.current?.stopReplay()}
            />
          </div>
          <div className="space-y-4">
            <ConfidenceMeter />
            <ProfilePanel compact />
            <KeyboardCheatsheet />
          </div>
        </div>
      </main>

      <footer className="border-t border-shell-border py-4 text-center text-xs text-shell-muted">
        NeuraShell v0.3 · suite_role: app · computer_side · MIT ·{" "}
        <a href="https://neurabeach.com" className="text-cyan-400 underline-offset-2 hover:underline">
          NeuraBeach
        </a>
      </footer>
    </div>
  );
}

function KeyboardCheatsheet() {
  return (
    <div className="rounded-xl border border-shell-border bg-shell-panel p-4 text-sm">
      <h2 className="mb-2 text-sm font-semibold tracking-wide text-shell-muted uppercase">
        Keyboard sim
      </h2>
      <ul className="space-y-1 text-shell-fg/90">
        <li>
          <kbd className="kbd">Arrows</kbd> / <kbd className="kbd">WASD</kbd> velocity
        </li>
        <li>
          <kbd className="kbd">Enter</kbd> confirm · <kbd className="kbd">Space</kbd> safe confirm
        </li>
        <li>
          <kbd className="kbd">Esc</kbd> STOP · <kbd className="kbd">⌘Z</kbd> UNDO
        </li>
        <li>
          <kbd className="kbd">1</kbd>–<kbd className="kbd">4</kbd> switch indices
        </li>
        <li className="text-shell-muted">Actuation requires ARM when readiness allows</li>
      </ul>
    </div>
  );
}
