import { describe, expect, it } from "vitest";
import {
  cleanupIndicator,
  observeResize,
  updateIndicator,
  updateIndicatorNextFrame,
} from "./indicator";

function rect(box: { left: number; right: number; top: number; bottom: number }): DOMRect {
  return {
    left: box.left,
    right: box.right,
    top: box.top,
    bottom: box.bottom,
    width: box.right - box.left,
    height: box.bottom - box.top,
    x: box.left,
    y: box.top,
    toJSON() {},
  } as DOMRect;
}

describe("indicator", () => {
  it("measures from the left edge in LTR and includes scroll", () => {
    const list = document.createElement("div");
    const tab = document.createElement("button");
    list.appendChild(tab);
    document.body.appendChild(list);
    list.getBoundingClientRect = () => rect({ left: 10, right: 210, top: 0, bottom: 40 });
    tab.getBoundingClientRect = () => rect({ left: 50, right: 90, top: 4, bottom: 36 });
    Object.defineProperty(list, "scrollLeft", { configurable: true, value: 8 });
    Object.defineProperty(list, "scrollTop", { configurable: true, value: 3 });

    updateIndicator(list, tab);
    expect(list.style.getPropertyValue("--ut-indicator-left")).toBe("48px");
    expect(list.style.getPropertyValue("--ut-indicator-top")).toBe("7px");
    expect(list.style.getPropertyValue("--ut-indicator-width")).toBe("40px");
    expect(list.style.getPropertyValue("--ut-indicator-height-val")).toBe("32px");

    cleanupIndicator(list);
    expect(list.style.getPropertyValue("--ut-indicator-left")).toBe("");
    expect(list.style.getPropertyValue("--ut-indicator-top")).toBe("");
    list.remove();
  });

  it("measures from the right edge in RTL", () => {
    const list = document.createElement("div");
    list.setAttribute("dir", "rtl");
    const tab = document.createElement("button");
    list.appendChild(tab);
    document.body.appendChild(list);
    list.getBoundingClientRect = () => rect({ left: 0, right: 200, top: 0, bottom: 40 });
    tab.getBoundingClientRect = () => rect({ left: 120, right: 180, top: 5, bottom: 35 });
    Object.defineProperty(list, "scrollLeft", { configurable: true, value: 4 });
    Object.defineProperty(list, "scrollTop", { configurable: true, value: 0 });

    updateIndicator(list, tab);
    expect(list.style.getPropertyValue("--ut-indicator-left")).toBe("24px");
    expect(list.style.getPropertyValue("--ut-indicator-width")).toBe("60px");
    list.remove();
  });

  it("updates on the next frame and can cancel", () => {
    const list = document.createElement("div");
    const tab = document.createElement("button");
    list.appendChild(tab);
    document.body.appendChild(list);
    const cancel = updateIndicatorNextFrame(list, tab);
    expect(list.style.getPropertyValue("--ut-indicator-width")).not.toBe("");
    cancel();
    list.remove();
  });

  it("repositions the active tab when the list resizes and disconnects", () => {
    const captured: { callback: ResizeObserverCallback | null } = { callback: null };
    let disconnected = false;
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        captured.callback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {
        disconnected = true;
      }
    } as unknown as typeof ResizeObserver;

    try {
      const list = document.createElement("div");
      const tab = document.createElement("button");
      list.appendChild(tab);
      document.body.appendChild(list);
      list.getBoundingClientRect = () => rect({ left: 0, right: 100, top: 0, bottom: 20 });
      tab.getBoundingClientRect = () => rect({ left: 10, right: 30, top: 0, bottom: 20 });
      Object.defineProperty(list, "scrollLeft", { configurable: true, value: 0 });
      Object.defineProperty(list, "scrollTop", { configurable: true, value: 0 });

      const stop = observeResize(list, [tab], () => 0);
      captured.callback?.([], {} as ResizeObserver);
      expect(list.style.getPropertyValue("--ut-indicator-left")).toBe("10px");

      const stopMissing = observeResize(list, [tab], () => -1);
      captured.callback?.([], {} as ResizeObserver);
      stop();
      stopMissing();
      expect(disconnected).toBe(true);
      list.remove();
    } finally {
      globalThis.ResizeObserver = Original;
    }
  });
});
