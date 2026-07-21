/**
 * Intent → OS sample format (matches Beach packages/intent-to-os JSON stream).
 * Computer-side only — never implant APIs.
 */
export type OsSample = {
  vx: number;
  vy: number;
  /** 0–1 click probability / confirm strength */
  click: number;
  /** unix seconds (Intent→OS) or ms — we send seconds for CLI compatibility */
  t: number;
};

export type OsActuateMode = "off" | "dry-run" | "live";

export type OsPreviewLine = {
  id: number;
  at: number;
  kind: "move" | "click" | "skip" | "post" | "error" | "info";
  text: string;
};

export const DEFAULT_OS_ENDPOINT = "http://127.0.0.1:8765/intent";
export const MAX_OS_PREVIEW = 48;
