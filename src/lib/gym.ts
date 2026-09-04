import type { GestureId } from "@/lib/intents/types";
import { gestureFromIntent, type ActionMappings } from "@/lib/intents/mapping";
import type { IntentEvent } from "@/lib/intents/types";

/** Honest gym-slice default (~3 min). Full 12-minute option is 720s. */
export const GYM_SLICE_SEC = 180;
export const GYM_FULL_SEC = 720;
export const GYM_TRIAL_COUNT = 8;
export const GYM_TRIAL_TIMEOUT_MS = 4000;
export const GYM_REMAP_MISS = 0.25;
export const GYM_FAIL_MISS = 0.35;
export const GYM_STALE_MS = 7 * 24 * 60 * 60 * 1000;
export const DRIFT_WINDOW_MS = 60_000;
export const DRIFT_CONF_FLOOR = 0.35;

export type GymAction = "click";

export type TrialResult = "hit" | "wrong" | "timeout" | "low_confidence";

export type GymRemap = { from: GestureId; to: GestureId; reason: string };

export function isMiss(result: TrialResult): boolean {
  return result !== "hit";
}

export function missRate(results: TrialResult[]): number {
  if (!results.length) return 1;
  return results.filter(isMiss).length / results.length;
}

export function gymIsFresh(
  lastGymAt: number | null | undefined,
  lastGymMissRate: number | null | undefined,
  now = Date.now()
): boolean {
  if (lastGymAt == null || !Number.isFinite(lastGymAt)) return false;
  if (now - lastGymAt > GYM_STALE_MS) return false;
  if (lastGymMissRate != null && lastGymMissRate > GYM_FAIL_MISS) return false;
  return true;
}

export function calibratedEnough(
  profile: {
    lastGymAt?: number | null;
    lastGymMissRate?: number | null;
    mappings?: ActionMappings | null;
  },
  now = Date.now()
): boolean {
  return gymIsFresh(profile.lastGymAt, profile.lastGymMissRate, now) && Boolean(profile.mappings?.click);
}

export function scoreTrial(opts: {
  expected: GestureId;
  observed: GestureId | null;
  confidence: number | null;
  threshold: number;
  timedOut: boolean;
}): TrialResult {
  if (opts.timedOut || opts.observed == null) return "timeout";
  if (opts.observed !== opts.expected) return "wrong";
  if (opts.confidence != null && opts.confidence < opts.threshold) return "low_confidence";
  return "hit";
}

export function scoreIntentTrial(
  event: IntentEvent,
  expected: GestureId,
  threshold: number
): TrialResult {
  const observed = gestureFromIntent(event);
  const confidence =
    event.type === "class_label" ? event.confidence : observed ? 0.9 : null;
  return scoreTrial({
    expected,
    observed,
    confidence,
    threshold,
    timedOut: false,
  });
}

export function shouldOfferRemap(rate: number): boolean {
  return rate > GYM_REMAP_MISS;
}

export function driftIsBad(confidenceMean: number | null, floor = DRIFT_CONF_FLOOR): boolean {
  return confidenceMean != null && confidenceMean < floor;
}
