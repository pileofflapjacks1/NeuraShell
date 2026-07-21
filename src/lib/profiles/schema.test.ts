import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE,
  isShellProfile,
  sanitizeProfile,
} from "./schema";
import { exportProfileJson, importProfileJson } from "./storage";

describe("profile schema", () => {
  it("accepts default profile", () => {
    expect(isShellProfile(DEFAULT_PROFILE)).toBe(true);
  });

  it("sanitizes out-of-range values", () => {
    const p = sanitizeProfile({
      name: "x".repeat(100),
      dwellMs: 99999,
      confidenceThreshold: 2,
      safeMode: true,
      switchTimingMs: 10,
      switchCount: 9 as unknown as 4,
      defaultMode: "laser" as unknown as "idle",
    });
    expect(p.name.length).toBe(64);
    expect(p.dwellMs).toBe(5000);
    expect(p.confidenceThreshold).toBe(1);
    expect(p.switchTimingMs).toBe(200);
    expect(p.switchCount).toBe(4);
    expect(p.defaultMode).toBe("idle");
  });

  it("round-trips export/import JSON", () => {
    const json = exportProfileJson({
      ...DEFAULT_PROFILE,
      name: "Demo",
      dwellMs: 700,
    });
    const back = importProfileJson(json);
    expect(back.name).toBe("Demo");
    expect(back.dwellMs).toBe(700);
    expect(back.version).toBe("0.1.0");
  });
});
