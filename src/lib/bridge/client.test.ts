import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBridgeRemoteAdapter } from "./client";
import {
  BRIDGE_BACKOFF_MS,
  BRIDGE_WS_URL,
  formatBridgeMessageAge,
  SESSION_CONNECTION_LABEL,
  type BridgeHealth,
} from "./health";
import { createKeyboardAdapter } from "@/lib/intents/keyboard";
import { createSyntheticAdapter } from "@/lib/intents/synthetic";
import { useShellStore } from "@/lib/store";
import { DEFAULT_PROFILE, sanitizeProfile } from "@/lib/profiles/schema";
import { DEFAULT_MAPPINGS } from "@/lib/intents/mapping";
import type { IntentAdapter, IntentEvent } from "@/lib/intents/types";

class FakeSocket {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  constructor(readonly url: string) {}
  close() {
    this.onclose?.();
  }
  open() {
    this.onopen?.();
  }
  /** Browser order: error, then close. */
  fail() {
    this.onerror?.();
    this.onclose?.();
  }
  message(data: string) {
    this.onmessage?.({ data });
  }
}

function gymProfile() {
  return sanitizeProfile({
    ...DEFAULT_PROFILE,
    calibratedAt: "2026-07-21T00:00:00.000Z",
    lastGymAt: Date.now(),
    lastGymMissRate: 0.1,
    mappings: { ...DEFAULT_MAPPINGS },
  });
}

function resetStore() {
  useShellStore.setState({
    connection: "disconnected",
    bridgeLastMessageAt: null,
    mode: "point",
    safeMode: true,
    hold: false,
    frozen: false,
    freezeReason: null,
    frozenAt: null,
    confidence: 0.5,
    confidenceSamples: [],
    lastIntentAt: Date.now(),
    lastIntent: null,
    profile: gymProfile(),
    cursor: { x: 0.5, y: 0.5 },
    clickTargetId: null,
    typed: "",
    switchIndex: 0,
    pendingMode: null,
    statusMessage: "test",
    undoStack: [],
    hydrated: true,
    calibrating: false,
    armed: false,
    recording: false,
    recordingStartedAt: null,
    recordedEvents: [],
    lastRecording: null,
    replaying: false,
    osMode: "off",
    osEndpoint: "http://127.0.0.1:8765/intent",
    osPreview: [],
    osLastSampleAt: null,
    osLiveOk: null,
    osPostCount: 0,
    osErrorCount: 0,
    driftNudge: false,
    driftBadSince: null,
  });
}

type Scheduled = { id: number; fn: () => void; ms: number };

function harness() {
  const sockets: FakeSocket[] = [];
  const scheduled: Scheduled[] = [];
  const health: BridgeHealth[] = [];
  let seq = 0;
  const adapter = createBridgeRemoteAdapter({
    onHealth: (snapshot) => {
      health.push(snapshot);
      useShellStore.getState().noteBridgeHealth(snapshot);
    },
    connect: (url) => {
      const sock = new FakeSocket(url);
      sockets.push(sock);
      return sock as unknown as WebSocket;
    },
    schedule: (fn, ms) => {
      const id = ++seq;
      scheduled.push({ id, fn, ms });
      return id;
    },
    clearScheduled: (id) => {
      const idx = scheduled.findIndex((job) => job.id === id);
      if (idx >= 0) scheduled.splice(idx, 1);
    },
  });
  return { adapter, sockets, scheduled, health };
}

describe("bridge health", () => {
  const adapters: IntentAdapter[] = [];

  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    for (const adapter of adapters) adapter.stop();
    adapters.length = 0;
    vi.unstubAllGlobals();
  });

  it("does not report open before onopen", () => {
    const seen: BridgeHealth["state"][] = [];
    const intents: IntentEvent[] = [];
    const sockets: FakeSocket[] = [];
    const adapter = createBridgeRemoteAdapter({
      onHealth: (snapshot) => {
        seen.push(snapshot.state);
        useShellStore.getState().noteBridgeHealth(snapshot);
      },
      connect: (url) => {
        const sock = new FakeSocket(url);
        sockets.push(sock);
        return sock as unknown as WebSocket;
      },
      schedule: () => 0,
      clearScheduled: () => {},
    });
    adapters.push(adapter);

    adapter.start((event) => intents.push(event));

    expect(seen).toEqual(["connecting"]);
    expect(sockets[0]?.url).toBe(BRIDGE_WS_URL);
    expect(useShellStore.getState().connection).toBe("bridge-connecting");
    expect(SESSION_CONNECTION_LABEL[useShellStore.getState().connection]).toBe(
      "Bridge connecting"
    );
    expect(SESSION_CONNECTION_LABEL["bridge-connecting"]).not.toBe("Bridge remote");

    sockets[0]?.message(JSON.stringify({ type: "velocity_2d", vx: 0.25, vy: 0, t: 1 }));
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({ type: "velocity_2d", vx: 0.25 });
    expect(seen).not.toContain("open");
    expect(useShellStore.getState().connection).toBe("bridge-connecting");
    expect(useShellStore.getState().bridgeLastMessageAt).toEqual(expect.any(Number));
    expect(
      formatBridgeMessageAge(useShellStore.getState().bridgeLastMessageAt, Date.now())
    ).toBe("just now");

    sockets[0]?.open();
    expect(seen.at(-1)).toBe("open");
    expect(useShellStore.getState().connection).toBe("bridge-remote");
    expect(SESSION_CONNECTION_LABEL["bridge-remote"]).toBe("Bridge remote");
  });

  it("close while armed HOLDs and leaves live OS in dry-run", () => {
    const { adapter, sockets, scheduled } = harness();
    adapters.push(adapter);
    adapter.start(() => {});

    expect(useShellStore.getState().connection).toBe("bridge-connecting");
    sockets[0]?.open();
    expect(useShellStore.getState().connection).toBe("bridge-remote");

    expect(useShellStore.getState().arm()).toBe(true);
    useShellStore.setState({ osMode: "live" });
    const x0 = useShellStore.getState().cursor.x;

    sockets[0]?.fail();

    const lost = useShellStore.getState();
    expect(lost.connection).toBe("bridge-lost");
    expect(SESSION_CONNECTION_LABEL[lost.connection]).toBe("Bridge lost");
    expect(lost.hold).toBe(true);
    expect(lost.freezeReason).toBe("hold");
    expect(lost.armed).toBe(true);
    expect(lost.mode).toBe("point");
    expect(lost.osMode).toBe("dry-run");
    expect(lost.osPreview.some((line) => /dry-run/.test(line.text))).toBe(true);
    expect(lost.statusMessage).toMatch(/HOLD/);
    expect(lost.statusMessage).toMatch(/keyboard fallback/i);

    lost.applyIntent({ type: "velocity_2d", vx: 1, vy: 0, t: Date.now() });
    expect(useShellStore.getState().cursor.x).toBe(x0);
    expect(useShellStore.getState().osPostCount).toBe(0);
    expect(useShellStore.getState().osMode).toBe("dry-run");

    expect(scheduled[0]?.ms).toBe(BRIDGE_BACKOFF_MS[0]);
    scheduled[0]?.fn();
    expect(sockets).toHaveLength(2);
    expect(useShellStore.getState().connection).toBe("bridge-lost");
    expect(useShellStore.getState().hold).toBe(true);

    sockets[1]?.open();
    const reopened = useShellStore.getState();
    expect(reopened.connection).toBe("bridge-remote");
    expect(reopened.hold).toBe(true);
    expect(reopened.osMode).toBe("dry-run");
    expect(reopened.armed).toBe(true);
  });

  it("after a lost HOLD, release keeps keyboard control and leaves OS dry-run", () => {
    const { adapter, sockets } = harness();
    adapters.push(adapter);
    adapter.start(() => {});
    sockets[0]?.open();
    expect(useShellStore.getState().arm()).toBe(true);
    useShellStore.setState({ osMode: "live" });
    sockets[0]?.fail();

    expect(useShellStore.getState().hold).toBe(true);
    expect(useShellStore.getState().osMode).toBe("dry-run");

    useShellStore.getState().releaseHold();
    const x0 = useShellStore.getState().cursor.x;
    useShellStore.getState().applyIntent({ type: "velocity_2d", vx: 1, vy: 0, t: Date.now() });

    const next = useShellStore.getState();
    expect(next.connection).toBe("bridge-lost");
    expect(next.hold).toBe(false);
    expect(next.armed).toBe(true);
    expect(next.osMode).toBe("dry-run");
    expect(next.cursor.x).toBeGreaterThan(x0);
    expect(next.osPostCount).toBe(0);
  });

  it("close while disarmed does not HOLD and still drops live OS", () => {
    const { adapter, sockets } = harness();
    adapters.push(adapter);
    adapter.start(() => {});
    sockets[0]?.open();
    useShellStore.setState({ armed: false, osMode: "live" });
    sockets[0]?.fail();

    const lost = useShellStore.getState();
    expect(lost.connection).toBe("bridge-lost");
    expect(lost.hold).toBe(false);
    expect(lost.frozen).toBe(false);
    expect(lost.armed).toBe(false);
    expect(lost.osMode).toBe("dry-run");
    expect(SESSION_CONNECTION_LABEL[lost.connection]).toBe("Bridge lost");
  });

  it("keyboard STOP still works with no socket", () => {
    let sockets = 0;
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor() {
          sockets += 1;
        }
      }
    );
    const listeners = new Map<string, Set<(ev: Event) => void>>();
    vi.stubGlobal("window", {
      addEventListener(type: string, fn: (ev: Event) => void) {
        const set = listeners.get(type) ?? new Set<(ev: Event) => void>();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener(type: string, fn: (ev: Event) => void) {
        listeners.get(type)?.delete(fn);
      },
    });
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => {});

    useShellStore.setState({
      connection: "disconnected",
      mode: "click",
      armed: true,
      frozen: false,
      hold: false,
      osMode: "live",
    });

    const keyboard = createKeyboardAdapter();
    adapters.push(keyboard);
    keyboard.start((event) => useShellStore.getState().applyIntent(event));

    const handlers = listeners.get("keydown");
    expect(handlers?.size).toBe(1);
    handlers?.forEach((fn) =>
      fn({
        key: "Escape",
        preventDefault() {},
        target: { tagName: "BODY" },
      } as unknown as Event)
    );

    const stopped = useShellStore.getState();
    expect(sockets).toBe(0);
    expect(stopped.mode).toBe("idle");
    expect(stopped.frozen).toBe(true);
    expect(stopped.freezeReason).toBe("stop");
    expect(stopped.armed).toBe(false);
    expect(stopped.osMode).toBe("dry-run");
    expect(stopped.connection).toBe("disconnected");
  });

  it("synthetic session runs with no bridge socket", () => {
    let sockets = 0;
    vi.stubGlobal(
      "WebSocket",
      class {
        constructor() {
          sockets += 1;
        }
      }
    );
    const events: IntentEvent[] = [];
    const synthetic = createSyntheticAdapter({ intervalMs: 60_000 });
    adapters.push(synthetic);
    synthetic.start((event) => events.push(event));
    expect(events[0]).toMatchObject({ type: "synthetic", name: "session_start" });
    expect(sockets).toBe(0);
    expect(useShellStore.getState().connection).toBe("disconnected");
  });
});
