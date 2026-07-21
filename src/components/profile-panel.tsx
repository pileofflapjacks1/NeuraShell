"use client";

import { useRef } from "react";
import { useShellStore } from "@/lib/store";
import {
  downloadProfile,
  exportProfileJson,
  importProfileJson,
} from "@/lib/profiles/storage";

export function ProfilePanel({ compact = false }: { compact?: boolean }) {
  const profile = useShellStore((s) => s.profile);
  const setProfile = useShellStore((s) => s.setProfile);
  const replaceProfile = useShellStore((s) => s.replaceProfile);
  const setStatus = useShellStore((s) => s.setStatus);
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = () => {
    downloadProfile(profile);
    setStatus("Profile exported as JSON.");
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const next = importProfileJson(text);
      replaceProfile(next);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed.");
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportProfileJson(profile));
      setStatus("Profile JSON copied to clipboard.");
    } catch {
      setStatus("Clipboard unavailable — use Export file.");
    }
  };

  return (
    <section
      aria-labelledby="profile-heading"
      className="rounded-xl border border-shell-border bg-shell-panel p-4 sm:p-5"
    >
      <h2
        id="profile-heading"
        className="mb-3 text-sm font-semibold tracking-wide text-shell-muted uppercase"
      >
        Profile (local)
      </h2>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-shell-muted">Name</span>
          <input
            className="shell-input mt-1 w-full"
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="text-shell-muted">Default mode</span>
          <select
            className="shell-input mt-1 w-full"
            value={profile.defaultMode}
            onChange={(e) =>
              setProfile({
                defaultMode: e.target.value as typeof profile.defaultMode,
              })
            }
          >
            {["idle", "point", "click", "type", "switch"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!compact && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-shell-muted">Dwell ms</span>
            <input
              type="number"
              min={100}
              max={5000}
              className="shell-input mt-1 w-full"
              value={profile.dwellMs}
              onChange={(e) => setProfile({ dwellMs: Number(e.target.value) })}
            />
          </label>
          <label className="block text-sm">
            <span className="text-shell-muted">Confidence threshold (0–1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step={0.05}
              className="shell-input mt-1 w-full"
              value={profile.confidenceThreshold}
              onChange={(e) =>
                setProfile({ confidenceThreshold: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-shell-muted">Switch timing ms</span>
            <input
              type="number"
              min={200}
              max={5000}
              className="shell-input mt-1 w-full"
              value={profile.switchTimingMs}
              onChange={(e) =>
                setProfile({ switchTimingMs: Number(e.target.value) })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="text-shell-muted">Switch count</span>
            <select
              className="shell-input mt-1 w-full"
              value={profile.switchCount}
              onChange={(e) =>
                setProfile({
                  switchCount: Number(e.target.value) as 2 | 3 | 4,
                })
              }
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onExport} className="shell-btn shell-btn-primary min-h-12 px-4">
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="shell-btn shell-btn-secondary min-h-12 px-4"
        >
          Import file
        </button>
        <button type="button" onClick={onCopy} className="shell-btn shell-btn-ghost min-h-12 px-4">
          Copy JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="mt-3 text-xs text-shell-muted">
        Stored in localStorage only. NeuralBridge-friendly field names (dwellMs,
        confidenceThreshold, switchTimingMs). No cloud / neural data upload.
      </p>
    </section>
  );
}
