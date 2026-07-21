import type { IntentEvent } from "./types";

export const RECORDING_VERSION = "0.3.0" as const;
export const MAX_RECORDED_EVENTS = 8000;

export type IntentRecording = {
  version: typeof RECORDING_VERSION;
  name: string;
  createdAt: string;
  /** Event timestamps are milliseconds from recording start (t=0). */
  events: IntentEvent[];
  source?: string;
};

export function isIntentRecording(value: unknown): value is IntentRecording {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    r.version === RECORDING_VERSION &&
    typeof r.name === "string" &&
    typeof r.createdAt === "string" &&
    Array.isArray(r.events)
  );
}

export function toRelativeEvents(
  events: IntentEvent[],
  startedAt: number
): IntentEvent[] {
  return events.map((e) => ({ ...e, t: Math.max(0, e.t - startedAt) }));
}

export function buildRecording(
  events: IntentEvent[],
  startedAt: number,
  name = "NeuraShell capture"
): IntentRecording {
  const relative = toRelativeEvents(events, startedAt).slice(0, MAX_RECORDED_EVENTS);
  return {
    version: RECORDING_VERSION,
    name: name.slice(0, 80),
    createdAt: new Date().toISOString(),
    events: relative,
    source: "neurashell",
  };
}

export function exportRecordingJson(rec: IntentRecording): string {
  return JSON.stringify(rec, null, 2);
}

export function importRecordingJson(json: string): IntentRecording {
  const parsed = JSON.parse(json) as unknown;
  if (!isIntentRecording(parsed)) {
    // Soft accept legacy: { events: IntentEvent[] }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { events?: unknown }).events)) {
      const events = (parsed as { events: IntentEvent[] }).events;
      const name =
        typeof (parsed as { name?: string }).name === "string"
          ? (parsed as { name: string }).name
          : "Imported";
      return buildRecording(
        events.map((e) => ({ ...e, t: typeof e.t === "number" ? e.t : 0 })),
        0,
        name
      );
    }
    throw new Error("Invalid NeuraShell intent recording JSON");
  }
  return {
    ...parsed,
    events: parsed.events.slice(0, MAX_RECORDED_EVENTS),
  };
}

export function downloadRecording(
  rec: IntentRecording,
  filename = "neurashell-recording.json"
) {
  const blob = new Blob([exportRecordingJson(rec)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Replay adapter: fires relative-t events on a timeline. */
export function createReplayAdapter(events: IntentEvent[]): {
  id: string;
  start: (onIntent: (e: IntentEvent) => void, onDone?: () => void) => void;
  stop: () => void;
} {
  let timers: number[] = [];
  let stopped = false;

  return {
    id: "replay",
    start(onIntent, onDone) {
      stopped = false;
      timers = [];
      if (!events.length) {
        onDone?.();
        return;
      }
      const sorted = [...events].sort((a, b) => a.t - b.t);
      for (const e of sorted) {
        const id = window.setTimeout(() => {
          if (stopped) return;
          onIntent({ ...e, t: Date.now() });
        }, e.t);
        timers.push(id);
      }
      const lastT = sorted[sorted.length - 1]?.t ?? 0;
      const endId = window.setTimeout(() => {
        if (!stopped) onDone?.();
      }, lastT + 50);
      timers.push(endId);
    },
    stop() {
      stopped = true;
      for (const id of timers) window.clearTimeout(id);
      timers = [];
    },
  };
}
