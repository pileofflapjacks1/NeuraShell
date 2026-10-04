import type { IntentAdapter, IntentEvent, IntentHandler } from "@/lib/intents/types";
import {
  BRIDGE_BACKOFF_MS,
  BRIDGE_CHANNEL,
  BRIDGE_WS_URL,
  type BridgeHealth,
  type BridgeLinkState,
} from "@/lib/bridge/health";

/**
 * Optional Neurabridge client (soft remote only).
 * Degrades gracefully if the local service is missing.
 *
 * Path (no neurabridge package):
 * 1. WebSocket ws://127.0.0.1:7711 — "open" only after onopen
 * 2. BroadcastChannel "neurabridge-intent" (same-origin side channel)
 *
 * onerror / onclose mark the link lost and reconnect with backoff.
 * Keyboard and synthetic sessions do not need this adapter.
 *
 * Never required for NeuraShell demos — synthetic + keyboard always work.
 */

export type BridgeRemoteOptions = {
  url?: string;
  onHealth?: (health: BridgeHealth) => void;
  /** Test seam. Defaults to the browser WebSocket. */
  connect?: (url: string) => WebSocket;
  /** Test seam. Defaults to setTimeout. Return value is passed to clearScheduled. */
  schedule?: (fn: () => void, delayMs: number) => unknown;
  clearScheduled?: (id: unknown) => void;
  backoffMs?: readonly number[];
};

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

function resolveOptions(urlOrOptions: string | BridgeRemoteOptions | undefined): {
  url: string;
  onHealth?: (health: BridgeHealth) => void;
  connect: (url: string) => WebSocket;
  schedule: (fn: () => void, delayMs: number) => unknown;
  clearScheduled: (id: unknown) => void;
  backoffMs: readonly number[];
} {
  const options: BridgeRemoteOptions =
    typeof urlOrOptions === "string" ? { url: urlOrOptions } : (urlOrOptions ?? {});
  return {
    url: options.url ?? BRIDGE_WS_URL,
    onHealth: options.onHealth,
    connect: options.connect ?? ((url) => new WebSocket(url)),
    schedule: options.schedule ?? ((fn, delayMs) => setTimeout(fn, delayMs)),
    clearScheduled:
      options.clearScheduled ??
      ((id) => {
        clearTimeout(id as ReturnType<typeof setTimeout>);
      }),
    backoffMs: options.backoffMs ?? BRIDGE_BACKOFF_MS,
  };
}

export function createBridgeRemoteAdapter(
  urlOrOptions: string | BridgeRemoteOptions = BRIDGE_WS_URL
): IntentAdapter {
  const options = resolveOptions(urlOrOptions);
  let ws: WebSocket | null = null;
  let channel: BroadcastChannel | null = null;
  let handler: IntentHandler | null = null;
  let stopped = false;
  let started = false;
  let linkState: BridgeLinkState = "connecting";
  let lastMessageAt: number | null = null;
  let socketGen = 0;
  let attempt = 0;
  let retryTimer: unknown = null;

  const emit = () => {
    options.onHealth?.({ state: linkState, lastMessageAt });
  };

  const noteMessage = () => {
    lastMessageAt = Date.now();
    emit();
  };

  const clearRetry = () => {
    if (retryTimer == null) return;
    options.clearScheduled(retryTimer);
    retryTimer = null;
  };

  const scheduleReconnect = () => {
    if (stopped || retryTimer != null) return;
    const delay = options.backoffMs[Math.min(attempt, options.backoffMs.length - 1)] ?? 8000;
    attempt += 1;
    retryTimer = options.schedule(() => {
      retryTimer = null;
      if (stopped) return;
      openSocket();
    }, delay);
  };

  const enterLost = () => {
    if (stopped) return;
    const changed = linkState !== "lost";
    linkState = "lost";
    if (changed) emit();
    scheduleReconnect();
  };

  const markOpen = () => {
    if (stopped) return;
    clearRetry();
    attempt = 0;
    const changed = linkState !== "open";
    linkState = "open";
    if (changed) emit();
  };

  const deliver = (data: unknown) => {
    const intent = parseIntent(data);
    if (intent && handler) handler(intent);
  };

  function openSocket() {
    if (stopped) return;
    if (ws) {
      const stale = ws;
      ws = null;
      stale.onopen = null;
      stale.onmessage = null;
      stale.onerror = null;
      stale.onclose = null;
      try {
        stale.close();
      } catch {
        /* ignore */
      }
    }

    const generation = ++socketGen;
    let sock: WebSocket;
    try {
      sock = options.connect(options.url);
    } catch {
      enterLost();
      return;
    }
    ws = sock;

    sock.onopen = () => {
      if (stopped || generation !== socketGen) return;
      markOpen();
    };
    sock.onerror = () => {
      if (stopped || generation !== socketGen) return;
      enterLost();
    };
    sock.onclose = () => {
      if (generation !== socketGen) return;
      if (ws === sock) ws = null;
      if (stopped) return;
      enterLost();
    };
    sock.onmessage = (ev) => {
      if (stopped || generation !== socketGen) return;
      noteMessage();
      try {
        deliver(JSON.parse(String(ev.data)) as unknown);
      } catch {
        // Non-JSON still counts as a frame for last-message age.
      }
    };
  }

  function openChannel() {
    try {
      channel = new BroadcastChannel(BRIDGE_CHANNEL);
      channel.onmessage = (ev) => {
        if (stopped) return;
        noteMessage();
        deliver(ev.data);
      };
    } catch {
      channel = null;
    }
  }

  return {
    id: "bridge-remote",
    start(onIntent) {
      if (started) return;
      started = true;
      handler = onIntent;
      stopped = false;
      attempt = 0;
      lastMessageAt = null;
      linkState = "connecting";
      // Connecting until onopen. Do not report open here.
      emit();
      openChannel();
      openSocket();
    },
    stop() {
      stopped = true;
      clearRetry();
      socketGen += 1;
      if (ws) {
        const sock = ws;
        ws = null;
        sock.onopen = null;
        sock.onmessage = null;
        sock.onerror = null;
        sock.onclose = null;
        try {
          sock.close();
        } catch {
          /* ignore */
        }
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
    },
  };
}

/** Soft check: whether a local bridge port might be up (best-effort, non-blocking). */
export async function probeBridge(url = BRIDGE_WS_URL, timeoutMs = 400): Promise<boolean> {
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
