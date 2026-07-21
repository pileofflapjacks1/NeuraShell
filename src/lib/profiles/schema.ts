import type { ShellMode } from "@/lib/intents/types";

/**
 * Local profile shape — NeuralBridge-friendly field names documented below.
 *
 * Mapping notes (for optional Bridge later):
 * - confidenceThreshold → Bridge filter min confidence
 * - dwellMs → dwell select timing for continuous intent
 * - switchTimingMs → switch scan period
 * - defaultMode → session mode after connect
 * - safeMode → raise confirm thresholds / larger targets
 */
export interface ShellProfile {
  version: "0.1.0";
  name: string;
  defaultMode: ShellMode;
  dwellMs: number;
  confidenceThreshold: number;
  safeMode: boolean;
  switchTimingMs: number;
  switchCount: 2 | 3 | 4;
  updatedAt: string;
}

export const DEFAULT_PROFILE: ShellProfile = {
  version: "0.1.0",
  name: "Default",
  defaultMode: "idle",
  dwellMs: 600,
  confidenceThreshold: 0.65,
  safeMode: true,
  switchTimingMs: 900,
  switchCount: 4,
  updatedAt: new Date(0).toISOString(),
};

export function isShellProfile(value: unknown): value is ShellProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    p.version === "0.1.0" &&
    typeof p.name === "string" &&
    typeof p.dwellMs === "number" &&
    typeof p.confidenceThreshold === "number" &&
    typeof p.safeMode === "boolean" &&
    typeof p.switchTimingMs === "number" &&
    typeof p.defaultMode === "string"
  );
}

export function sanitizeProfile(raw: Partial<ShellProfile> & { name?: string }): ShellProfile {
  const modes: ShellMode[] = ["point", "click", "type", "switch", "idle"];
  const defaultMode = modes.includes(raw.defaultMode as ShellMode)
    ? (raw.defaultMode as ShellMode)
    : DEFAULT_PROFILE.defaultMode;
  const switchCount = ([2, 3, 4] as const).includes(raw.switchCount as 2 | 3 | 4)
    ? (raw.switchCount as 2 | 3 | 4)
    : DEFAULT_PROFILE.switchCount;

  return {
    version: "0.1.0",
    name: (raw.name ?? DEFAULT_PROFILE.name).slice(0, 64),
    defaultMode,
    dwellMs: clamp(Number(raw.dwellMs ?? DEFAULT_PROFILE.dwellMs), 100, 5000),
    confidenceThreshold: clamp(
      Number(raw.confidenceThreshold ?? DEFAULT_PROFILE.confidenceThreshold),
      0,
      1
    ),
    safeMode: Boolean(raw.safeMode ?? DEFAULT_PROFILE.safeMode),
    switchTimingMs: clamp(
      Number(raw.switchTimingMs ?? DEFAULT_PROFILE.switchTimingMs),
      200,
      5000
    ),
    switchCount,
    updatedAt: new Date().toISOString(),
  };
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
