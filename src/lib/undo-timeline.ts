import type { ShellMode } from "@/lib/intents/types";

/**
 * Shell actions the panic bar can reverse. ARM, OS live, and Bridge link
 * changes are intentionally absent. Computer-side session state only.
 */
export type UndoAction =
  | { kind: "mode"; from: ShellMode; to: ShellMode; at?: number }
  | { kind: "type_char"; char: string; at?: number }
  | { kind: "click_target"; targetId: string | null; prevId: string | null; at?: number }
  | { kind: "safe_mode"; from: boolean; to: boolean; at?: number };

export type UndoTimelineRow = {
  /** Index in the store stack. 0 is the oldest entry. */
  stackIndex: number;
  at: number;
  label: string;
  newest: boolean;
};

export function undoActionLabel(action: UndoAction): string {
  switch (action.kind) {
    case "mode":
      return `Switched mode from ${action.from} to ${action.to}`;
    case "type_char":
      return `Typed “${action.char}”`;
    case "click_target":
      return action.targetId ? `Selected ${action.targetId}` : "Cleared the click target";
    case "safe_mode":
      return action.to ? "Turned safe mode on" : "Turned safe mode off";
  }
}

/** Local clock, stable across test timezones that still use a 24-hour wall time. */
export function formatUndoTime(at: number): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/** Fill `at` on entries that lack one. Returns the same array when nothing is missing. */
export function withUndoTimestamps(stack: readonly UndoAction[], now = Date.now()): UndoAction[] {
  if (stack.every((action) => typeof action.at === "number")) {
    return stack as UndoAction[];
  }
  return stack.map((action) =>
    typeof action.at === "number" ? action : { ...action, at: now }
  );
}

/** Newest stack entry first. Does not sort by time and does not drop older rows. */
export function undoTimeline(stack: readonly UndoAction[], now = Date.now()): UndoTimelineRow[] {
  const rows: UndoTimelineRow[] = [];
  const newestIndex = stack.length - 1;
  for (let stackIndex = newestIndex; stackIndex >= 0; stackIndex -= 1) {
    const action = stack[stackIndex];
    rows.push({
      stackIndex,
      at: typeof action.at === "number" ? action.at : now,
      label: undoActionLabel(action),
      newest: stackIndex === newestIndex,
    });
  }
  return rows;
}
