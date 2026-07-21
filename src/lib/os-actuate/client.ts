import type { OsSample } from "./types";

export type PostResult = { ok: boolean; status?: number; error?: string };

/**
 * POST one Intent→OS sample to a local endpoint.
 * Used only in live mode — dry-run never calls this.
 *
 * Expected local receiver (optional): HTTP JSON body matching OsSample.
 * Intent→OS CLI prefers WebSocket ingest; use scripts/os-intent-relay.mjs
 * to bridge HTTP → WS or log lines.
 */
export async function postOsSample(
  endpoint: string,
  sample: OsSample,
  timeoutMs = 400
): Promise<PostResult> {
  if (typeof window === "undefined") {
    return { ok: false, error: "not in browser" };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sample),
      signal: controller.signal,
      mode: "cors",
      keepalive: true,
    });
    window.clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    window.clearTimeout(timer);
    const msg = e instanceof Error ? e.message : "post failed";
    // Common when relay is not running
    return { ok: false, error: msg.includes("abort") ? "timeout" : msg };
  }
}

/** Probe endpoint with a zero sample (best-effort). */
export async function probeOsEndpoint(endpoint: string): Promise<boolean> {
  const r = await postOsSample(
    endpoint,
    { vx: 0, vy: 0, click: 0, t: Date.now() / 1000 },
    350
  );
  return r.ok;
}
