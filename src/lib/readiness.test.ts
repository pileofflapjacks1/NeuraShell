import { describe, expect, it } from "vitest";
import { computeReadiness, meanConfidence, type ReadinessInput } from "./readiness";
import { GYM_STALE_MS } from "./gym";

const now = 1_800_000_000_000;

function base(over: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    connected: true,
    frozen: false,
    armed: false,
    safeMode: true,
    msSinceIntent: 200,
    confidence: 0.7,
    confidenceMean: 0.65,
    confidenceThreshold: 0.65,
    replaying: false,
    recording: false,
    lastGymAt: now - 60_000,
    lastGymMissRate: 0.1,
    ...over,
  };
}

describe("computeReadiness", () => {
  it("blocks when disconnected", () => {
    const r = computeReadiness(base({ connected: false }), now);
    expect(r.canArm).toBe(false);
    expect(r.level).toBe("blocked");
    expect(r.score).toBeLessThan(100);
  });

  it("allows arm when connected, not frozen, and gym is fresh", () => {
    const r = computeReadiness(base(), now);
    expect(r.canArm).toBe(true);
    expect(r.factors.find((f) => f.id === "calibrated")?.pass).toBe(true);
  });

  it("blocks arm while frozen", () => {
    const r = computeReadiness(base({ frozen: true, armed: true }), now);
    expect(r.canArm).toBe(false);
  });

  it("uncalibrated profile (never gym'd) cannot arm even with a high score", () => {
    const r = computeReadiness(
      base({
        lastGymAt: null,
        lastGymMissRate: null,
        confidence: 0.99,
        confidenceMean: 0.99,
        msSinceIntent: 50,
      }),
      now
    );
    expect(r.score).toBeGreaterThanOrEqual(55);
    expect(r.canArm).toBe(false);
    expect(r.level).toBe("blocked");
    const cal = r.factors.find((f) => f.id === "calibrated");
    expect(cal?.required).toBe(true);
    expect(cal?.pass).toBe(false);
  });

  it("stale lastGymAt (>7d) → calibrated factor fails", () => {
    const r = computeReadiness(
      base({ lastGymAt: now - GYM_STALE_MS - 1000, lastGymMissRate: 0.05 }),
      now
    );
    const cal = r.factors.find((f) => f.id === "calibrated");
    expect(cal?.pass).toBe(false);
    expect(cal?.required).toBe(true);
    expect(r.canArm).toBe(false);
  });

  it("high lastGymMissRate blocks arm", () => {
    const r = computeReadiness(base({ lastGymMissRate: 0.4 }), now);
    expect(r.canArm).toBe(false);
    expect(r.factors.find((f) => f.id === "calibrated")?.pass).toBe(false);
  });

  it("does not let score >= 55 bypass missing gym", () => {
    const r = computeReadiness(
      base({
        lastGymAt: null,
        safeMode: true,
        confidence: 1,
        confidenceMean: 1,
        msSinceIntent: 10,
      }),
      now
    );
    expect(r.score).toBeGreaterThanOrEqual(55);
    expect(r.canArm).toBe(false);
  });
});

describe("meanConfidence", () => {
  it("averages window", () => {
    const t = 10_000;
    const m = meanConfidence(
      [
        { t: t - 100, c: 0.5 },
        { t: t - 50, c: 1 },
      ],
      2500,
      t
    );
    expect(m).toBeCloseTo(0.75);
  });
});
