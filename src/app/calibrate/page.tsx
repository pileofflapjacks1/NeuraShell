"use client";

import { IntentHost } from "@/components/intent-host";
import { DisclaimerBanner } from "@/components/disclaimer-banner";
import { PanicBar } from "@/components/panic-bar";
import { FreezeOverlay } from "@/components/freeze-overlay";
import { ShellNav } from "@/components/shell-nav";
import { CalibrationWizard } from "@/components/calibration-wizard";

export default function CalibratePage() {
  return (
    <div className="flex min-h-full flex-col">
      <IntentHost />
      <DisclaimerBanner />
      <PanicBar />
      <FreezeOverlay />
      <ShellNav active="/calibrate" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-6 sm:px-4">
        <CalibrationWizard />
      </main>
    </div>
  );
}
