"use client";

import Link from "next/link";
import { IntentHost } from "@/components/intent-host";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PanicBar } from "@/components/panic-bar";
import { FreezeOverlay } from "@/components/freeze-overlay";
import { ShellNav } from "@/components/shell-nav";
import { ProfilePanel } from "@/components/profile-panel";
import { useShellStore } from "@/lib/store";
import { useEffect } from "react";

export default function SettingsPage() {
  const hydrate = useShellStore((s) => s.hydrate);
  const profile = useShellStore((s) => s.profile);
  const setProfile = useShellStore((s) => s.setProfile);
  const setSafeMode = useShellStore((s) => s.setSafeMode);
  const safeMode = useShellStore((s) => s.safeMode);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <div className="flex min-h-full flex-col">
      <IntentHost />
      <DisclaimerBanner />
      <PanicBar />
      <FreezeOverlay />
      <ShellNav active="/settings" />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-6 sm:px-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-shell-muted">
          Advanced profile: dwell, thresholds, switch timing. Saved locally only.
        </p>
        <Link href="/calibrate" className="shell-btn shell-btn-primary inline-flex min-h-12 px-4 no-underline">
          Open calibration wizard
        </Link>
        {profile.calibratedAt && (
          <p className="text-xs text-shell-muted">
            Last calibrated: {new Date(profile.calibratedAt).toLocaleString()}
          </p>
        )}
        <ProfilePanel />
        <section className="rounded-xl border border-shell-border bg-shell-panel p-4">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-shell-muted uppercase">
            Safe mode defaults
          </h2>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={safeMode}
              onChange={(e) => {
                setSafeMode(e.target.checked);
                setProfile({ safeMode: e.target.checked });
              }}
            />
            Enable Safe mode by default in this profile
          </label>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-shell-bg p-3 text-xs text-shell-muted">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  );
}
