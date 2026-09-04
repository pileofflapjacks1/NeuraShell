import { describe, expect, it } from "vitest";
import {
  calibratedEnough,
  GYM_STALE_MS,
  gymIsFresh,
  missRate,
  scoreIntentTrial,
  scoreTrial,
  shouldOfferRemap,
} from "./gym";
import { DEFAULT_MAPPINGS } from "./intents/mapping";

describe("gym scoring", () => {
  it("computes miss rate", () => {
    expect(missRate(["hit", "wrong", "timeout", "hit"])).toBeCloseTo(0.5);
    expect(missRate([])).toBe(1);
  });

  it("scores wrong key and low confidence as misses", () => {
    expect(
      scoreTrial({
        expected: "confirm",
        observed: "switch",
        confidence: 1,
        threshold: 0.65,
        timedOut: false,
      })
    ).toBe("wrong");
    expect(
      scoreIntentTrial(
        { type: "class_label", label: "confirm", confidence: 0.2, t: 1 },
        "confirm",
        0.65
      )
    ).toBe("low_confidence");
  });

  it("offers remap above 0.25 miss", () => {
    expect(shouldOfferRemap(0.25)).toBe(false);
    expect(shouldOfferRemap(0.26)).toBe(true);
  });
});

describe("gym freshness / calibrated-enough", () => {
  const now = 2_000_000_000_000;

  it("never gym'd is not fresh", () => {
    expect(gymIsFresh(null, null, now)).toBe(false);
    expect(calibratedEnough({ mappings: DEFAULT_MAPPINGS }, now)).toBe(false);
  });

  it("stale lastGymAt (>7d) fails", () => {
    expect(gymIsFresh(now - GYM_STALE_MS - 1, 0.1, now)).toBe(false);
  });

  it("fresh gym with mapping is calibrated-enough", () => {
    expect(
      calibratedEnough(
        { lastGymAt: now - 1000, lastGymMissRate: 0.1, mappings: DEFAULT_MAPPINGS },
        now
      )
    ).toBe(true);
  });
});
