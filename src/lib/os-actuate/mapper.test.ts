import { describe, expect, it } from "vitest";
import { formatOsPreview, intentToOsSample } from "./mapper";

describe("intentToOsSample", () => {
  it("maps velocity_2d", () => {
    const s = intentToOsSample({
      type: "velocity_2d",
      vx: 0.5,
      vy: -0.2,
      t: 1_700_000_000_000,
    });
    expect(s).toMatchObject({ vx: 0.5, vy: -0.2, click: 0 });
    expect(s!.t).toBeCloseTo(1_700_000_000, 0);
  });

  it("maps confirm class_label to click", () => {
    const s = intentToOsSample(
      { type: "class_label", label: "confirm", confidence: 0.9, t: 1000 },
      { clickThreshold: 0.65 }
    );
    expect(s?.click).toBe(0.9);
  });

  it("ignores low confidence confirm", () => {
    const s = intentToOsSample(
      { type: "class_label", label: "confirm", confidence: 0.2, t: 1000 },
      { clickThreshold: 0.65 }
    );
    expect(s?.click).toBe(0);
  });
});

describe("formatOsPreview", () => {
  it("labels clicks", () => {
    const f = formatOsPreview({ vx: 0, vy: 0, click: 0.9, t: 1 }, "dry-run");
    expect(f.kind).toBe("click");
    expect(f.text).toContain("CLICK");
  });
});
