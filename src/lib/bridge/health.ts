import type { ConnectionState } from "@/lib/intents/types";

/**
 * Soft Bridge link health. "open" means the local WebSocket fired onopen.
 * Computer-side only — ws://127.0.0.1:7711 and BroadcastChannel, no package.
 */

export const BRIDGE_WS_URL = "ws://127.0.0.1:7711";
export const BRIDGE_CHANNEL = "neurabridge-intent";

/** Reconnect delays after a drop. Reset when the socket opens. */
export const BRIDGE_BACKOFF_MS = [500, 1000, 2000, 4000, 8000] as const;

export type BridgeLinkState = "connecting" | "open" | "lost";

export type BridgeHealth = {
  state: BridgeLinkState;
  /** When the last WS or channel frame arrived. Null if none this attempt. */
  lastMessageAt: number | null;
};

export const SESSION_CONNECTION_LABEL: Record<ConnectionState, string> = {
  disconnected: "Disconnected",
  synthetic: "Synthetic",
  "bridge-sim": "Bridge sim",
  "bridge-connecting": "Bridge connecting",
  "bridge-remote": "Bridge remote",
  "bridge-lost": "Bridge lost",
};

export function isBridgeConnection(connection: ConnectionState): boolean {
  return (
    connection === "bridge-connecting" ||
    connection === "bridge-remote" ||
    connection === "bridge-lost"
  );
}

export function connectionForBridgeLink(state: BridgeLinkState): ConnectionState {
  switch (state) {
    case "connecting":
      return "bridge-connecting";
    case "open":
      return "bridge-remote";
    case "lost":
      return "bridge-lost";
  }
}

export function connectionStatusMessage(connection: ConnectionState): string {
  switch (connection) {
    case "disconnected":
      return "Disconnected.";
    case "synthetic":
      return "Synthetic session active — check readiness, then ARM.";
    case "bridge-sim":
      return "Bridge simulator connected.";
    case "bridge-connecting":
      return "Bridge connecting to ws://127.0.0.1:7711. Keyboard still works.";
    case "bridge-remote":
      return "Bridge remote open (local WS / channel).";
    case "bridge-lost":
      return "Bridge lost — keyboard fallback. Reconnecting.";
  }
}

/** Age of the last Bridge frame for the session badge. */
export function formatBridgeMessageAge(lastMessageAt: number | null, now: number): string {
  if (lastMessageAt == null || !Number.isFinite(lastMessageAt)) return "no messages yet";
  const delta = now - lastMessageAt;
  if (!Number.isFinite(delta) || delta < 1000) return "just now";
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}
