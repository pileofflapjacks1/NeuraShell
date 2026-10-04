/**
 * @vitest-environment jsdom
 */
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PanicBar } from "./panic-bar";
import { useShellStore } from "@/lib/store";
import { DEFAULT_PROFILE, sanitizeProfile } from "@/lib/profiles/schema";
import { DEFAULT_MAPPINGS } from "@/lib/intents/mapping";

function resetStore() {
  useShellStore.setState({
    connection: "synthetic",
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
    profile: sanitizeProfile({
      ...DEFAULT_PROFILE,
      calibratedAt: "2026-07-21T00:00:00.000Z",
      lastGymAt: Date.now(),
      lastGymMissRate: 0.1,
      mappings: { ...DEFAULT_MAPPINGS },
    }),
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

describe("panic bar undo timeline", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    cleanup();
  });

  it("says there is nothing to undo and keeps STOP and HOLD", () => {
    render(createElement(PanicBar));
    expect(screen.getByText("There is nothing to undo.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "STOP" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HOLD" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "UNDO" }));
    expect(useShellStore.getState().mode).toBe("point");
  });

  it("the newest row pops one entry and an older row does not", () => {
    useShellStore.getState().setModeImmediate("click");
    useShellStore.getState().setModeImmediate("type");
    render(createElement(PanicBar));

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]?.textContent).toMatch(/Switched mode from click to type/);
    expect(items[1]?.textContent).toMatch(/Switched mode from point to click/);
    expect(items[1]?.querySelector("button")).toBeNull();

    fireEvent.click(items[1]!);
    expect(useShellStore.getState().mode).toBe("type");
    expect(useShellStore.getState().undoStack).toHaveLength(2);

    fireEvent.click(items[0]!.querySelector("button")!);
    expect(useShellStore.getState().mode).toBe("click");
    expect(useShellStore.getState().undoStack).toHaveLength(1);
  });

  it("stamps a timestamp onto an entry that has none", () => {
    useShellStore.setState({
      undoStack: [{ kind: "mode", from: "idle", to: "point" }],
    });
    render(createElement(PanicBar));
    const entry = useShellStore.getState().undoStack[0];
    expect(entry?.at).toEqual(expect.any(Number));
    expect(screen.getByRole("button", { name: /Switched mode from idle to point/ })).toBeTruthy();
  });
});
