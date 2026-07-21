import { describe, expect, it } from "vitest";
import { computeReadiness, meanConfidence } from "./readiness";

describe("computeReadiness", () => {
  it("blocks when disconnected", () => {
    const r = computeReadiness({
      connected: false,
      calibrated: true,
      frozen: false,
      armed: false,
      safeMode: true,
      msSinceIntent: 100,
      confidence: 0.8,
      confidenceMean: 0.7,
      confidenceThreshold: 0.65,
      replaying: false,
      recording: false,
    });
    expect(r.canArm).toBe(false);
    expect(r.level).toBe("blocked");
    expect(r.score).toBeLessThan(100);
  });

  it("allows arm when connected and not frozen", () => {
    const r = computeReadiness({
      connected: true,
      calibrated: true,
      frozen: false,
      armed: false,
      safeMode: true,
      msSinceIntent: 200,
      confidence: 0.7,
      confidenceMean: 0.65,
      confidenceThreshold: 0.65,
      replaying: false,
      recording: false,
    });
    expect(r.canArm).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(55);
  });

  it("blocks arm while frozen", () => {
    const r = computeReadiness({
      connected: true,
      calibrated: true,
      frozen: true,
      armed: true,
      safeMode: true,
      msSinceIntent: 100,
      confidence: 0.9,
      confidenceMean: 0.8,
      confidenceThreshold: 0.65,
      replaying: false,
      recording: false,
    });
    expect(r.canArm).toBe(false);
  });
});

describe("meanConfidence", () => {
  it("averages window", () => {
    const now = 10_000;
    const m = meanConfidence(
      [
        { t: now - 100, c: 0.5 },
        { t: now - 50, c: 1 },
      ],
      2500,
      now
    );
    expect(m).toBeCloseTo(0.75);
  });
});
