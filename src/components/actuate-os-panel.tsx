"use client";

import { useShellStore } from "@/lib/store";
import { DEFAULT_OS_ENDPOINT } from "@/lib/os-actuate/types";
import { probeOsEndpoint } from "@/lib/os-actuate/client";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * Actuate OS — suite glue to Intent→OS sample stream.
 * Default dry-run (preview only). Live = POST localhost (optional relay).
 */
export function ActuateOsPanel() {
  const osMode = useShellStore((s) => s.osMode);
  const osEndpoint = useShellStore((s) => s.osEndpoint);
  const osPreview = useShellStore((s) => s.osPreview);
  const osLiveOk = useShellStore((s) => s.osLiveOk);
  const osPostCount = useShellStore((s) => s.osPostCount);
  const osErrorCount = useShellStore((s) => s.osErrorCount);
  const setOsMode = useShellStore((s) => s.setOsMode);
  const setOsEndpoint = useShellStore((s) => s.setOsEndpoint);
  const clearOsPreview = useShellStore((s) => s.clearOsPreview);
  const enableOsLive = useShellStore((s) => s.enableOsLive);
  const armed = useShellStore((s) => s.armed);
  const safeMode = useShellStore((s) => s.safeMode);
  const hold = useShellStore((s) => s.hold);
  const frozen = useShellStore((s) => s.frozen);

  const [confirmLive, setConfirmLive] = useState(false);
  const [probing, setProbing] = useState(false);

  const onRequestLive = () => {
    if (safeMode && !confirmLive) {
      setConfirmLive(true);
      return;
    }
    setConfirmLive(false);
    enableOsLive();
  };

  const onProbe = async () => {
    setProbing(true);
    const ok = await probeOsEndpoint(osEndpoint);
    useShellStore.setState({ osLiveOk: ok });
    useShellStore.getState().pushOsPreview({
      at: Date.now(),
      kind: ok ? "info" : "error",
      text: ok ? `Probe OK: ${osEndpoint}` : `Probe failed: ${osEndpoint}`,
    });
    setProbing(false);
  };

  return (
    <section
      aria-labelledby="actuate-os-heading"
      className="rounded-xl border border-shell-border bg-shell-panel p-4 sm:p-5"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="actuate-os-heading"
          className="text-sm font-semibold tracking-wide text-shell-muted uppercase"
        >
          Actuate OS
        </h2>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-bold uppercase",
            osMode === "live"
              ? "bg-orange-600/40 text-orange-100"
              : osMode === "dry-run"
                ? "bg-cyan-600/30 text-cyan-100"
                : "bg-shell-bg text-shell-muted"
          )}
        >
          {osMode}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-shell-muted">
        Maps intents to Intent→OS samples (<code className="text-cyan-300">vx, vy, click, t</code>).
        <strong className="text-shell-fg"> Dry-run is the default</strong> — preview only, no OS
        pointer. Live POSTs JSON to a local endpoint (optional relay). STOP always drops live →
        dry-run. Not implant software.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setConfirmLive(false);
            setOsMode("off");
          }}
          className={cn(
            "shell-btn min-h-11 px-3 text-sm",
            osMode === "off" ? "shell-btn-primary" : "shell-btn-secondary"
          )}
        >
          Off
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirmLive(false);
            setOsMode("dry-run");
          }}
          className={cn(
            "shell-btn min-h-11 px-3 text-sm",
            osMode === "dry-run" ? "shell-btn-primary" : "shell-btn-secondary"
          )}
        >
          Dry-run
        </button>
        <button
          type="button"
          onClick={onRequestLive}
          disabled={hold || frozen || (!armed && osMode !== "live")}
          className={cn(
            "shell-btn min-h-11 px-3 text-sm font-bold",
            osMode === "live"
              ? "border-orange-400 bg-orange-600/40 text-orange-50"
              : "border-orange-500/40 bg-orange-950/40 text-orange-100"
          )}
          title={!armed ? "ARM the shell first" : "POST samples to local endpoint"}
        >
          Live
        </button>
        <button
          type="button"
          onClick={() => void onProbe()}
          disabled={probing}
          className="shell-btn shell-btn-ghost min-h-11 px-3 text-sm"
        >
          {probing ? "Probing…" : "Probe"}
        </button>
        <button
          type="button"
          onClick={clearOsPreview}
          className="shell-btn shell-btn-ghost min-h-11 px-3 text-sm"
        >
          Clear log
        </button>
      </div>

      {confirmLive && safeMode && (
        <div className="mb-3 rounded-lg border border-orange-500/50 bg-orange-950/40 p-3">
          <p className="text-sm text-orange-50">
            Safe mode: confirm enabling <strong>live</strong> OS posts? Requires a local relay (
            <code className="text-xs">node scripts/os-intent-relay.mjs</code>). Browser still cannot
            move the system mouse alone.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="shell-btn min-h-11 border-orange-400 bg-orange-600 px-4 font-bold text-white"
              onClick={() => {
                setConfirmLive(false);
                enableOsLive();
              }}
            >
              Confirm live
            </button>
            <button
              type="button"
              className="shell-btn shell-btn-secondary min-h-11 px-4"
              onClick={() => setConfirmLive(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <label className="mb-3 block text-sm">
        <span className="text-shell-muted">Local endpoint (live POST)</span>
        <input
          className="shell-input mt-1 w-full font-mono text-sm"
          value={osEndpoint}
          onChange={(e) => setOsEndpoint(e.target.value)}
          placeholder={DEFAULT_OS_ENDPOINT}
          spellCheck={false}
        />
      </label>

      <div className="mb-2 flex flex-wrap gap-3 text-xs text-shell-muted">
        <span>
          Posts: <strong className="text-shell-fg tabular-nums">{osPostCount}</strong>
        </span>
        <span>
          Errors: <strong className="text-shell-fg tabular-nums">{osErrorCount}</strong>
        </span>
        <span>
          Relay:{" "}
          <strong
            className={cn(
              osLiveOk === true && "text-emerald-300",
              osLiveOk === false && "text-red-300",
              osLiveOk === null && "text-shell-muted"
            )}
          >
            {osLiveOk === true ? "OK" : osLiveOk === false ? "unreachable" : "unknown"}
          </strong>
        </span>
        {!armed && <span className="text-amber-200">Shell DISARMED — live blocked</span>}
      </div>

      <div
        className="max-h-40 overflow-y-auto rounded-lg border border-shell-border bg-shell-bg p-2 font-mono text-[11px] leading-relaxed"
        aria-live="polite"
        aria-label="OS actuate preview log"
      >
        {osPreview.length === 0 ? (
          <p className="text-shell-muted">
            No samples yet. Enable dry-run, start synthetic, ARM for shell cursor; stream appears
            here.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {osPreview.map((line) => (
              <li
                key={line.id}
                className={cn(
                  line.kind === "error" && "text-red-300",
                  line.kind === "click" && "text-amber-200",
                  line.kind === "post" && "text-orange-200",
                  line.kind === "info" && "text-cyan-300",
                  line.kind === "move" && "text-shell-fg/90",
                  line.kind === "skip" && "text-shell-muted"
                )}
              >
                <span className="text-shell-muted">
                  {new Date(line.at).toLocaleTimeString()}{" "}
                </span>
                {line.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-shell-muted">
        Local relay:{" "}
        <code className="text-cyan-300">node scripts/os-intent-relay.mjs</code> · Intent→OS:{" "}
        <code className="text-cyan-300">
          python -m intent_to_os --source synthetic --dry-run
        </code>{" "}
        (separate process). Shell live mode feeds HTTP; adapter CLI prefers WS/CSV — use relay
        NDJSON or your own bridge.
      </p>
    </section>
  );
}
