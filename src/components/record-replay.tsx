"use client";

import { useRef } from "react";
import { useShellStore } from "@/lib/store";
import {
  downloadRecording,
  importRecordingJson,
  type IntentRecording,
} from "@/lib/intents/recording";
import { cn } from "@/lib/utils";

export interface RecordReplayProps {
  onStartReplay: (rec: IntentRecording) => void;
  onStopReplay: () => void;
}

export function RecordReplay({ onStartReplay, onStopReplay }: RecordReplayProps) {
  const recording = useShellStore((s) => s.recording);
  const replaying = useShellStore((s) => s.replaying);
  const recordedEvents = useShellStore((s) => s.recordedEvents);
  const lastRecording = useShellStore((s) => s.lastRecording);
  const startRecording = useShellStore((s) => s.startRecording);
  const stopRecording = useShellStore((s) => s.stopRecording);
  const clearRecording = useShellStore((s) => s.clearRecording);
  const loadRecording = useShellStore((s) => s.loadRecording);
  const setStatus = useShellStore((s) => s.setStatus);
  const fileRef = useRef<HTMLInputElement>(null);

  const bufferCount = recording
    ? recordedEvents.length
    : lastRecording?.events.length ?? recordedEvents.length;

  const activeRec = lastRecording;

  const onExport = () => {
    const rec =
      activeRec ??
      (recordedEvents.length
        ? stopRecording() ?? lastRecording
        : null);
    const finalRec = useShellStore.getState().lastRecording ?? rec;
    if (!finalRec || !finalRec.events.length) {
      setStatus("Nothing to export — record first.");
      return;
    }
    if (recording) stopRecording();
    const r = useShellStore.getState().lastRecording;
    if (r) downloadRecording(r);
  };

  return (
    <section
      aria-labelledby="record-replay-heading"
      className="rounded-xl border border-shell-border bg-shell-panel p-4 sm:p-5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="record-replay-heading"
          className="text-sm font-semibold tracking-wide text-shell-muted uppercase"
        >
          Record / Replay
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold",
            recording
              ? "bg-red-600/30 text-red-100"
              : replaying
                ? "bg-violet-600/30 text-violet-100"
                : "bg-shell-bg text-shell-muted"
          )}
        >
          {recording ? "● REC" : replaying ? "▶ REPLAY" : "idle"}
        </span>
      </div>

      <p className="mb-3 text-xs text-shell-muted">
        Capture intent streams locally for demos and debugging. Export JSON — no cloud upload.
        Replay actuates during playback (STOP cancels).
      </p>

      <p className="mb-3 font-mono text-sm text-shell-fg">
        Buffer: <strong className="tabular-nums">{bufferCount}</strong> events
        {activeRec ? (
          <span className="text-shell-muted"> · “{activeRec.name}”</span>
        ) : null}
      </p>

      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={replaying}
            className="shell-btn shell-btn-primary min-h-12 px-4"
          >
            Start record
          </button>
        ) : (
          <button
            type="button"
            onClick={() => stopRecording()}
            className="shell-btn min-h-12 border-red-400 bg-red-600/80 px-4 font-bold text-white"
          >
            Stop record
          </button>
        )}

        {!replaying ? (
          <button
            type="button"
            onClick={() => {
              if (recording) stopRecording();
              const rec = useShellStore.getState().lastRecording;
              if (!rec?.events.length) {
                setStatus("No recording to replay — capture or import first.");
                return;
              }
              onStartReplay(rec);
            }}
            disabled={recording}
            className="shell-btn shell-btn-secondary min-h-12 px-4"
          >
            Replay
          </button>
        ) : (
          <button
            type="button"
            onClick={onStopReplay}
            className="shell-btn min-h-12 border-violet-400 bg-violet-600/40 px-4 font-bold text-violet-50"
          >
            Stop replay
          </button>
        )}

        <button
          type="button"
          onClick={onExport}
          className="shell-btn shell-btn-ghost min-h-12 px-4"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shell-btn shell-btn-ghost min-h-12 px-4"
        >
          Import
        </button>
        <button
          type="button"
          onClick={clearRecording}
          className="shell-btn shell-btn-ghost min-h-12 px-4 text-shell-muted"
        >
          Clear
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const text = await f.text();
              const rec = importRecordingJson(text);
              loadRecording(rec);
            } catch (err) {
              setStatus(err instanceof Error ? err.message : "Import failed.");
            }
            e.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
