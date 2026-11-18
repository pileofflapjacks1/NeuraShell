import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/os-actuate/client", () => ({
  postOsSample: vi.fn(async () => ({ ok: true })),
}));

import { postOsSample } from "@/lib/os-actuate/client";
import { useShellStore } from "./store";
import { DEFAULT_PROFILE, sanitizeProfile } from "./profiles/schema";

const initial = useShellStore.getState();
const post = vi.mocked(postOsSample);
const ZERO = expect.objectContaining({ vx: 0, vy: 0, click: 0 });

function armedLive() {
  useShellStore.setState(
    {
      ...initial,
      hydrated: true,
      connection: "synthetic",
      mode: "point",
      profile: sanitizeProfile({ ...DEFAULT_PROFILE, lastGymAt: Date.now(), lastGymMissRate: 0 }),
    },
    true
  );
  expect(useShellStore.getState().arm()).toBe(true);
  expect(useShellStore.getState().enableOsLive()).toBe(true);
  post.mockClear();
}

describe("live OS halt sample", () => {
  beforeEach(armedLive);

  it.each([
    ["STOP", () => useShellStore.getState().panicStop()],
    ["HOLD", () => useShellStore.getState().panicHold()],
    ["disarm", () => useShellStore.getState().disarm()],
    ["session stop", () => useShellStore.getState().setConnection("disconnected")],
    [
      "Bridge loss",
      () => useShellStore.getState().noteBridgeHealth({ state: "lost", lastMessageAt: null }),
    ],
  ])("%s sends a zero sample to the receiver", (_name, act) => {
    act();
    expect(post).toHaveBeenCalledWith(useShellStore.getState().osEndpoint, ZERO);
  });

  it("sends nothing when OS live was never on", () => {
    useShellStore.getState().disarm();
    post.mockClear();
    useShellStore.getState().panicStop();
    useShellStore.getState().releaseHold();
    useShellStore.getState().panicHold();
    expect(post).not.toHaveBeenCalled();
  });

  it("live velocity posts in point mode but not in type mode", () => {
    const move = () =>
      useShellStore.getState().applyIntent({ type: "velocity_2d", vx: 1, vy: 0, t: Date.now() });
    move();
    expect(post).toHaveBeenCalledTimes(1);
    useShellStore.getState().setModeImmediate("type", false);
    move();
    expect(post).toHaveBeenCalledTimes(1);
  });
});
