// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createKeyboardAdapter } from "./keyboard";
import type { IntentAdapter, IntentEvent } from "./types";

function press(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

const frames = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

describe("keyboard adapter", () => {
  let adapter: IntentAdapter;
  let events: IntentEvent[];

  beforeEach(() => {
    document.body.innerHTML =
      '<button id="btn">HOLD</button><a id="link" href="/gym">Gym</a><input id="field" />';
    events = [];
    adapter = createKeyboardAdapter();
    adapter.start((e) => events.push(e));
  });

  afterEach(() => {
    adapter.stop();
  });

  it("Enter on the page confirms", () => {
    const ev = press(document.body, { key: "Enter" });
    expect(ev.defaultPrevented).toBe(true);
    expect(events).toEqual([expect.objectContaining({ type: "class_label", label: "confirm" })]);
  });

  it("Enter and Space on a button or link are left to the control", () => {
    for (const id of ["btn", "link"]) {
      for (const key of ["Enter", " "]) {
        const ev = press(document.getElementById(id)!, { key });
        expect(ev.defaultPrevented).toBe(false);
      }
    }
    expect(events).toEqual([]);
  });

  it("leaves browser chords alone", () => {
    for (const init of [
      { key: "a", metaKey: true },
      { key: "s", ctrlKey: true },
      { key: "ArrowLeft", altKey: true },
      { key: "1", metaKey: true },
    ]) {
      expect(press(document.body, init).defaultPrevented).toBe(false);
    }
    expect(events).toEqual([]);
  });

  it("does not repeat discrete intents while a key is held", () => {
    press(document.body, { key: "Enter" });
    press(document.body, { key: "Enter", repeat: true });
    press(document.body, { key: "1" });
    press(document.body, { key: "1", repeat: true });
    press(document.body, { key: "k", repeat: true });
    expect(events).toHaveLength(2);
  });

  it("Esc is STOP even as part of a chord, but not from a text field", () => {
    press(document.getElementById("field")!, { key: "Escape" });
    expect(events).toEqual([]);
    press(document.body, { key: "Escape", ctrlKey: true });
    expect(events).toEqual([expect.objectContaining({ type: "synthetic", name: "stop" })]);
  });

  it("drops held velocity keys when the window loses focus", async () => {
    press(document.body, { key: "d" });
    await frames();
    expect(events.some((e) => e.type === "velocity_2d")).toBe(true);

    window.dispatchEvent(new Event("blur"));
    await frames(40);
    events.length = 0;
    await frames();
    expect(events).toEqual([]);
  });
});
