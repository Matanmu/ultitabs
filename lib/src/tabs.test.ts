/**
 * UltiTabs v1.5 — test suite
 * Covers: basic switching, beforeChange / afterChange hooks (config + .on()),
 * cancellation, .off(), legacy onChange compat, destroy cleanup.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { createTabs } from "./tabs";

// ── DOM helpers ──────────────────────────────────────────────────────────────

function makeDOM(ids: string[] = ["a", "b", "c"]) {
  const section = document.createElement("div");
  section.setAttribute("data-ut-section", "test");

  const list = document.createElement("div");
  list.setAttribute("data-ut-list", "");

  ids.forEach((id) => {
    const tab = document.createElement("button");
    tab.setAttribute("data-ut-tab", id);
    tab.textContent = id.toUpperCase();
    list.appendChild(tab);

    const panel = document.createElement("div");
    panel.setAttribute("data-ut-panel", id);
    panel.textContent = `Panel ${id}`;
    section.appendChild(panel);
  });

  section.insertBefore(list, section.firstChild);
  document.body.appendChild(section);
  return section;
}

afterEach(() => {
  document.body.innerHTML = "";
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("createTabs — basic switching", () => {
  it("initialises to the first tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("setPath switches active tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("setPath is a no-op for the current tab", () => {
    const section = makeDOM();
    const after = vi.fn();
    const tabs = createTabs({ el: section, afterChange: after });
    tabs.setPath("a"); // already active
    expect(after).not.toHaveBeenCalled();
    tabs.destroy();
  });

  it("setPath is a no-op for unknown paths", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.setPath("zzz");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});

describe("beforeChange config hook", () => {
  it("fires before state changes, receives correct args", () => {
    const section = makeDOM();
    const fn = vi.fn();
    const tabs = createTabs({ el: section, beforeChange: fn });
    tabs.setPath("b");
    expect(fn).toHaveBeenCalledWith("b", "a");
    tabs.destroy();
  });

  it("cancels switch when returning false", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, beforeChange: () => false });
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("does not cancel when returning void/true", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, beforeChange: () => undefined });
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });
});

describe("afterChange config hook", () => {
  it("fires after state has changed", () => {
    const section = makeDOM();
    const order: string[] = [];
    const tabs = createTabs({
      el: section,
      afterChange: (path) => { order.push(`after:${path}`); },
    });
    tabs.setPath("b");
    expect(order).toContain("after:b");
    tabs.destroy();
  });

  it("receives (newPath, prevPath)", () => {
    const section = makeDOM();
    const fn = vi.fn();
    const tabs = createTabs({ el: section, afterChange: fn });
    tabs.setPath("c");
    expect(fn).toHaveBeenCalledWith("c", "a");
    tabs.destroy();
  });

  it("does NOT fire when beforeChange cancels", () => {
    const section = makeDOM();
    const after = vi.fn();
    const tabs = createTabs({
      el: section,
      beforeChange: () => false,
      afterChange: after,
    });
    tabs.setPath("b");
    expect(after).not.toHaveBeenCalled();
    tabs.destroy();
  });
});

describe(".on('beforeChange') — imperative subscription", () => {
  it("fires before state changes", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    tabs.on("beforeChange", fn);
    tabs.setPath("b");
    expect(fn).toHaveBeenCalledWith("b", "a");
    tabs.destroy();
  });

  it("cancels switch when handler returns false", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.on("beforeChange", () => false);
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("unsubscribes via returned function", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn(() => false as const);
    const unsub = tabs.on("beforeChange", fn);
    unsub();
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b"); // no longer blocked
    tabs.destroy();
  });
});

describe(".on('afterChange') — imperative subscription", () => {
  it("fires after state changes", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    tabs.on("afterChange", fn);
    tabs.setPath("b");
    expect(fn).toHaveBeenCalledWith("b", "a");
    tabs.destroy();
  });

  it("does not fire when cancelled", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const after = vi.fn();
    tabs.on("beforeChange", () => false);
    tabs.on("afterChange", after);
    tabs.setPath("b");
    expect(after).not.toHaveBeenCalled();
    tabs.destroy();
  });

  it("unsubscribes via returned function", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    const unsub = tabs.on("afterChange", fn);
    unsub();
    tabs.setPath("b");
    expect(fn).not.toHaveBeenCalled();
    tabs.destroy();
  });
});

describe(".off() — explicit unsubscribe", () => {
  it("removes a beforeChange handler", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const block = vi.fn(() => false as const);
    tabs.on("beforeChange", block);
    tabs.off("beforeChange", block);
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("removes an afterChange handler", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    tabs.on("afterChange", fn);
    tabs.off("afterChange", fn);
    tabs.setPath("b");
    expect(fn).not.toHaveBeenCalled();
    tabs.destroy();
  });

  it("removes a change handler", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    tabs.on("change", fn);
    tabs.off("change", fn);
    tabs.setPath("b");
    expect(fn).not.toHaveBeenCalled();
    tabs.destroy();
  });
});

describe("hook firing order", () => {
  it("beforeChange fires before change, afterChange fires last", () => {
    const section = makeDOM();
    const order: string[] = [];
    const tabs = createTabs({
      el: section,
      beforeChange: () => { order.push("beforeChange:config"); },
      afterChange:  () => { order.push("afterChange:config"); },
    });
    tabs.on("beforeChange", () => { order.push("beforeChange:on"); });
    tabs.on("change",       () => { order.push("change:on"); });
    tabs.on("afterChange",  () => { order.push("afterChange:on"); });
    tabs.setPath("b");
    expect(order).toEqual([
      "beforeChange:config",
      "beforeChange:on",
      "change:on",
      "afterChange:config",
      "afterChange:on",
    ]);
    tabs.destroy();
  });
});

describe("legacy onChange compatibility", () => {
  it("onChange still fires and can cancel", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, onChange: () => false });
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("onChange receives correct args", () => {
    const section = makeDOM();
    const fn = vi.fn();
    const tabs = createTabs({ el: section, onChange: fn });
    tabs.setPath("b");
    expect(fn).toHaveBeenCalledWith("b", "a");
    tabs.destroy();
  });
});

describe("destroy clears all hooks", () => {
  it("no handlers fire after destroy", () => {
    const section = makeDOM();
    const fn = vi.fn();
    const tabs = createTabs({ el: section });
    tabs.on("beforeChange", fn);
    tabs.on("change", fn);
    tabs.on("afterChange", fn);
    tabs.destroy();
    expect(() => tabs.setPath("b")).not.toThrow();
    expect(fn).not.toHaveBeenCalled();
  });
});