import type { IntentAdapter, IntentEvent, IntentHandler } from "@/lib/intents/types";

/**
 * Optional Neurabridge client (v0.1 stub + soft remote).
 * Degrades gracefully if Bridge package / local service is missing.
 *
 * Attempts (in order when startBridgeRemote is used):
 * 1. WebSocket ws://127.0.0.1:7711
 * 2. BroadcastChannel "neurabridge-intent" (if another tab / service posts)
 *
 * Never required for NeuraShell demos — synthetic + keyboard always work.
 */

const DEFAULT_WS = "ws://127.0.0.1:7711";
const CHANNEL = "neurabridge-intent";

function parseIntent(data: unknown): IntentEvent | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const t = typeof d.t === "number" ? d.t : Date.now();
  if (d.type === "velocity_2d" && typeof d.vx === "number" && typeof d.vy === "number") {
    return { type: "velocity_2d", vx: d.vx, vy: d.vy, t };
  }
  if (
    d.type === "class_label" &&
    typeof d.label === "string" &&
    typeof d.confidence === "number"
  ) {
    return { type: "class_label", label: d.label, confidence: d.confidence, t };
  }
  if (
    d.type === "switch_binary" &&
    typeof d.index === "number" &&
    typeof d.active === "boolean"
  ) {
    return { type: "switch_binary", index: d.index, active: d.active, t };
  }
  if (d.type === "synthetic" && typeof d.name === "string") {
    return { type: "synthetic", name: d.name, t };
  }
  // Bridge-style envelope: { kind: "intent", payload: IntentEvent }
  if (d.kind === "intent" && d.payload) {
    return parseIntent(d.payload);
  }
  return null;
}

export function createBridgeRemoteAdapter(url = DEFAULT_WS): IntentAdapter {
  let ws: WebSocket | null = null;
  let channel: BroadcastChannel | null = null;
  let handler: IntentHandler | null = null;
  let closed = false;

  return {
    id: "bridge-remote",
    start(onIntent) {
      handler = onIntent;
      closed = false;

      // BroadcastChannel always (same-origin multi-tab)
      try {
        channel = new BroadcastChannel(CHANNEL);
        channel.onmessage = (ev) => {
          const intent = parseIntent(ev.data);
          if (intent && handler) handler(intent);
        };
      } catch {
        channel = null;
      }

      try {
        ws = new WebSocket(url);
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(String(ev.data)) as unknown;
            const intent = parseIntent(data);
            if (intent && handler) handler(intent);
          } catch {
            // ignore non-JSON
          }
        };
        ws.onerror = () => {
          // Degrade silently — BC may still work
        };
        ws.onclose = () => {
          ws = null;
        };
      } catch {
        ws = null;
      }
    },
    stop() {
      closed = true;
      if (ws) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        ws = null;
      }
      if (channel) {
        try {
          channel.close();
        } catch {
          /* ignore */
        }
        channel = null;
      }
      handler = null;
      void closed;
    },
  };
}

/** Soft check: whether a local bridge port might be up (best-effort, non-blocking). */
export async function probeBridge(url = DEFAULT_WS, timeoutMs = 400): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return new Promise((resolve) => {
    let settled = false;
    let ws: WebSocket | null = null;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    try {
      ws = new WebSocket(url);
      ws.onopen = () => {
        clearTimeout(timer);
        done(true);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        done(false);
      };
    } catch {
      clearTimeout(timer);
      done(false);
    }
  });
}
