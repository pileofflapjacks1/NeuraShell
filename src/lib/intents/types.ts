/**
 * Generic intent vocabulary for NeuraShell v0.1.
 * Computer-side only — no implant / vendor SDKs.
 */

export type IntentEvent =
  | { type: "velocity_2d"; vx: number; vy: number; t: number }
  | { type: "class_label"; label: string; confidence: number; t: number }
  | { type: "switch_binary"; index: number; active: boolean; t: number }
  | { type: "synthetic"; name: string; t: number };

export type ConnectionState =
  | "disconnected"
  | "synthetic"
  | "bridge-sim"
  | "bridge-remote";

export type ShellMode = "point" | "click" | "type" | "switch" | "idle";

export type IntentHandler = (event: IntentEvent) => void;

export interface IntentAdapter {
  readonly id: string;
  start(onIntent: IntentHandler): void;
  stop(): void;
}
