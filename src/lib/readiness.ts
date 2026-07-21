/**
 * Session readiness score — pure function for tests + UI.
 * Shell is "about control": when am I allowed to arm actuation?
 */

export type ReadinessInput = {
  connected: boolean;
  calibrated: boolean;
  frozen: boolean; // STOP or HOLD
  armed: boolean;
  safeMode: boolean;
  /** ms since last intent; null if never */
  msSinceIntent: number | null;
  /** 0–1 current confidence */
  confidence: number;
  /** optional short-window mean confidence 0–1 */
  confidenceMean: number | null;
  confidenceThreshold: number;
  replaying: boolean;
  recording: boolean;
};

export type ReadinessFactor = {
  id: string;
  label: string;
  pass: boolean;
  required: boolean;
  weight: number;
  detail: string;
};

export type ReadinessResult = {
  score: number;
  factors: ReadinessFactor[];
  canArm: boolean;
  level: "blocked" | "caution" | "ready";
  summary: string;
};

const FRESH_MS = 4000;

export function computeReadiness(input: ReadinessInput, now = Date.now()): ReadinessResult {
  void now;
  const fresh =
    input.msSinceIntent !== null && input.msSinceIntent >= 0 && input.msSinceIntent <= FRESH_MS;

  const mean = input.confidenceMean ?? input.confidence;
  const signalOk = fresh && mean >= Math.min(0.25, input.confidenceThreshold * 0.4);

  const factors: ReadinessFactor[] = [
    {
      id: "connection",
      label: "Intent session",
      pass: input.connected || input.replaying,
      required: true,
      weight: 30,
      detail: input.replaying
        ? "Replay active (counts as session)."
        : input.connected
          ? "Connected to synthetic / bridge / sim."
          : "Start synthetic session or Bridge remote.",
    },
    {
      id: "not_frozen",
      label: "Not frozen",
      pass: !input.frozen,
      required: true,
      weight: 25,
      detail: input.frozen
        ? "STOP/HOLD active — RELEASE before arming."
        : "No panic freeze.",
    },
    {
      id: "calibrated",
      label: "Calibrated",
      pass: input.calibrated,
      required: false,
      weight: 20,
      detail: input.calibrated
        ? "Profile has calibration stamp."
        : "Optional but recommended — run /calibrate.",
    },
    {
      id: "signal",
      label: "Live signal",
      pass: signalOk,
      required: false,
      weight: 15,
      detail: signalOk
        ? `Recent intent (${input.msSinceIntent ?? "?"}ms ago), conf ~${Math.round(mean * 100)}%.`
        : "Need recent velocity/confirm (WASD or synthetic).",
    },
    {
      id: "safe_mode",
      label: "Safe mode",
      pass: input.safeMode,
      required: false,
      weight: 10,
      detail: input.safeMode
        ? "Safe mode ON (confirm on mode change)."
        : "Safe mode OFF — still allowed to arm.",
    },
  ];

  let earned = 0;
  let total = 0;
  for (const f of factors) {
    total += f.weight;
    if (f.pass) earned += f.weight;
  }
  const score = total > 0 ? Math.round((earned / total) * 100) : 0;

  const requiredOk = factors.filter((f) => f.required).every((f) => f.pass);
  const canArm = requiredOk && score >= 55 && !input.frozen;

  let level: ReadinessResult["level"] = "blocked";
  if (canArm && score >= 80) level = "ready";
  else if (canArm || (requiredOk && score >= 40)) level = "caution";
  else level = "blocked";

  if (input.armed && !input.frozen) {
    // Armed is a runtime state — boost presentation
    if (level === "caution") level = "ready";
  }

  const summary = input.armed
    ? input.frozen
      ? "Armed but frozen — RELEASE or STOP handling."
      : "Armed — intent may actuate modes."
    : canArm
      ? "Ready to arm actuation."
      : requiredOk
        ? "Improve signal/calibration, then arm."
        : "Connect a session and clear freeze to arm.";

  return { score, factors, canArm, level, summary };
}

export function meanConfidence(
  samples: Array<{ t: number; c: number }>,
  windowMs = 2500,
  now = Date.now()
): number | null {
  const recent = samples.filter((s) => now - s.t <= windowMs);
  if (!recent.length) return null;
  return recent.reduce((a, s) => a + s.c, 0) / recent.length;
}
