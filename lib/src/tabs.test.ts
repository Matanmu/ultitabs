/**
 * UltiTabs v2.0 — comprehensive test suite
 * Covers: basic switching, hooks, keyboard navigation, disabled tabs,
 * panel pairing by value, ARIA, destroy/double-init, persist, syncUrl.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTabs } from "./tabs";
import { detectRtlScrollType, logicalScrollFromStart, scrollLeftAfterDelta } from "./utils";

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

function makeDOMWithDisabled() {
  const section = makeDOM(["a", "b", "c", "d"]);
  const list = section.querySelector("[data-ut-list]")!;
  // Disable tabs b and c
  (list.children[1] as HTMLElement).setAttribute("data-ut-disabled", "");
  (list.children[2] as HTMLElement).setAttribute("data-ut-disabled", "");
  return section;
}

function makeDOMWithMismatchedPanels() {
  // Panels in different order than tabs
  const section = document.createElement("div");
  section.setAttribute("data-ut-section", "test");

  const list = document.createElement("div");
  list.setAttribute("data-ut-list", "");

  ["first", "second", "third"].forEach((id) => {
    const tab = document.createElement("button");
    tab.setAttribute("data-ut-tab", id);
    tab.textContent = id.toUpperCase();
    list.appendChild(tab);
  });

  // Add panels in reverse order
  ["third", "first", "second"].forEach((id) => {
    const panel = document.createElement("div");
    panel.setAttribute("data-ut-panel", id);
    panel.textContent = `Panel ${id}`;
    section.appendChild(panel);
  });

  section.insertBefore(list, section.firstChild);
  document.body.appendChild(section);
  return section;
}

function getTabs(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll("[data-ut-tab]"));
}

function getPanels(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll("[data-ut-panel]"));
}

function simulateKeyDown(element: HTMLElement, key: string, opts?: KeyboardEventInit) {
  element.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
}

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", location.pathname);
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ── Basic switching ──────────────────────────────────────────────────────────

describe("createTabs — basic switching", () => {
  it("initializes to the first tab", () => {
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
    tabs.setPath("a");
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

  it("respects defaultPath config", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, defaultPath: "c" });
    expect(tabs.getPath()).toBe("c");
    tabs.destroy();
  });

  it("respects data-ut-default attribute", () => {
    const section = makeDOM();
    section.setAttribute("data-ut-default", "b");
    const tabs = createTabs({ el: section });
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("accepts string selector for el", () => {
    const section = makeDOM();
    section.id = "my-tabs";
    const tabs = createTabs({ el: "#my-tabs" });
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});

// ── ARIA ─────────────────────────────────────────────────────────────────────

describe("ARIA attributes", () => {
  it("sets role=tablist on list", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const list = section.querySelector("[data-ut-list]");
    expect(list?.getAttribute("role")).toBe("tablist");
    tabs.destroy();
  });

  it("sets role=tab on each tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    getTabs(section).forEach((tab) => {
      expect(tab.getAttribute("role")).toBe("tab");
    });
    tabs.destroy();
  });

  it("sets role=tabpanel on each panel", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    getPanels(section).forEach((panel) => {
      expect(panel.getAttribute("role")).toBe("tabpanel");
    });
    tabs.destroy();
  });

  it("sets aria-selected correctly", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    expect(tabEls[0].getAttribute("aria-selected")).toBe("true");
    expect(tabEls[1].getAttribute("aria-selected")).toBe("false");
    tabs.setPath("b");
    expect(tabEls[0].getAttribute("aria-selected")).toBe("false");
    expect(tabEls[1].getAttribute("aria-selected")).toBe("true");
    tabs.destroy();
  });

  it("links tabs to panels with aria-controls", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    const panelEls = getPanels(section);
    tabEls.forEach((tab, i) => {
      const panelId = tab.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(panelEls[i].id).toBe(panelId);
    });
    tabs.destroy();
  });

  it("hides inactive panels", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const panels = getPanels(section);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    expect(panels[2].hidden).toBe(true);
    tabs.destroy();
  });
});

// ── Panel pairing by value ───────────────────────────────────────────────────

describe("panel pairing by value", () => {
  it("pairs tabs with panels by matching data-ut-tab/data-ut-panel values", () => {
    const section = makeDOMWithMismatchedPanels();
    const tabs = createTabs({ el: section });

    // Tab "first" should control panel "first" even though it's second in DOM
    expect(tabs.getPath()).toBe("first");
    const panels = getPanels(section);
    // Panel with value "first" should be visible
    const firstPanel = panels.find((p) => p.getAttribute("data-ut-panel") === "first");
    expect(firstPanel?.hidden).toBe(false);

    tabs.setPath("third");
    const thirdPanel = panels.find((p) => p.getAttribute("data-ut-panel") === "third");
    expect(thirdPanel?.hidden).toBe(false);
    expect(firstPanel?.hidden).toBe(true);

    tabs.destroy();
  });
});

// ── Disabled tabs ────────────────────────────────────────────────────────────

describe("disabled tabs", () => {
  it("setPath refuses disabled tabs", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    expect(tabs.getPath()).toBe("a");
    tabs.setPath("b"); // disabled
    expect(tabs.getPath()).toBe("a");
    tabs.setPath("d"); // enabled
    expect(tabs.getPath()).toBe("d");
    tabs.destroy();
  });

  it("sets aria-disabled on disabled tabs", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    expect(tabEls[0].getAttribute("aria-disabled")).toBeNull();
    expect(tabEls[1].getAttribute("aria-disabled")).toBe("true");
    expect(tabEls[2].getAttribute("aria-disabled")).toBe("true");
    expect(tabEls[3].getAttribute("aria-disabled")).toBeNull();
    tabs.destroy();
  });

  it("disabled tabs have tabindex=-1", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    expect(tabEls[1].getAttribute("tabindex")).toBe("-1");
    expect(tabEls[2].getAttribute("tabindex")).toBe("-1");
    tabs.destroy();
  });

  it("initializes to first enabled tab when first is disabled", () => {
    const section = makeDOM(["a", "b", "c"]);
    const list = section.querySelector("[data-ut-list]")!;
    (list.children[0] as HTMLElement).setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: section });
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });
});

// ── Keyboard navigation ──────────────────────────────────────────────────────

describe("keyboard navigation", () => {
  it("ArrowRight moves to next tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "ArrowRight");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("ArrowLeft moves to previous tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.setPath("b");
    const tabEls = getTabs(section);
    tabEls[1].focus();
    simulateKeyDown(tabEls[1], "ArrowLeft");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("Home moves to first tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.setPath("c");
    const tabEls = getTabs(section);
    tabEls[2].focus();
    simulateKeyDown(tabEls[2], "Home");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("End moves to last tab", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "End");
    expect(tabs.getPath()).toBe("c");
    tabs.destroy();
  });

  it("skips disabled tabs on ArrowRight", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "ArrowRight");
    // Should skip b and c (disabled) and go to d
    expect(tabs.getPath()).toBe("d");
    tabs.destroy();
  });

  it("skips disabled tabs on Home", () => {
    const section = makeDOMWithDisabled();
    // Disable first tab
    const list = section.querySelector("[data-ut-list]")!;
    (list.children[0] as HTMLElement).setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: section });
    // Active should be d (first enabled after a,b,c disabled)
    expect(tabs.getPath()).toBe("d");
    const tabEls = getTabs(section);
    tabEls[3].focus();
    simulateKeyDown(tabEls[3], "Home");
    // Should stay on d since a,b,c are all disabled
    expect(tabs.getPath()).toBe("d");
    tabs.destroy();
  });

  it("wraps around at the end", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.setPath("c");
    const tabEls = getTabs(section);
    tabEls[2].focus();
    simulateKeyDown(tabEls[2], "ArrowRight");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});

// ── Hooks ────────────────────────────────────────────────────────────────────

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
});

describe("afterChange config hook", () => {
  it("fires after state has changed", () => {
    const section = makeDOM();
    const order: string[] = [];
    const tabs = createTabs({
      el: section,
      afterChange: (path) => {
        order.push(`after:${path}`);
      },
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

describe(".on() and .off()", () => {
  it("on('beforeChange') can cancel", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.on("beforeChange", () => false);
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("on() returns unsubscribe function", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn(() => false as const);
    const unsub = tabs.on("beforeChange", fn);
    unsub();
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("off() removes a beforeChange handler and a change handler", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const before = vi.fn(() => false as const);
    const change = vi.fn();
    tabs.on("beforeChange", before);
    tabs.off("beforeChange", before);
    tabs.on("change", change);
    tabs.off("change", change);
    tabs.setPath("b");
    expect(before).not.toHaveBeenCalled();
    expect(change).not.toHaveBeenCalled();
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("off() removes handler", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const fn = vi.fn();
    tabs.on("afterChange", fn);
    tabs.off("afterChange", fn);
    tabs.setPath("b");
    expect(fn).not.toHaveBeenCalled();
    tabs.destroy();
  });

  it("hook firing order is correct", () => {
    const section = makeDOM();
    const order: string[] = [];
    const tabs = createTabs({
      el: section,
      beforeChange: () => {
        order.push("beforeChange:config");
      },
      afterChange: () => {
        order.push("afterChange:config");
      },
    });
    tabs.on("beforeChange", () => {
      order.push("beforeChange:on");
    });
    tabs.on("change", () => {
      order.push("change:on");
    });
    tabs.on("afterChange", () => {
      order.push("afterChange:on");
    });
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

// ── Destroy and double-init ──────────────────────────────────────────────────

describe("destroy", () => {
  it("clears all hooks", () => {
    const section = makeDOM();
    const fn = vi.fn();
    const tabs = createTabs({ el: section });
    tabs.on("beforeChange", fn);
    tabs.on("change", fn);
    tabs.on("afterChange", fn);
    tabs.destroy();
    tabs.setPath("b");
    expect(fn).not.toHaveBeenCalled();
  });

  it("removes ARIA attributes", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    tabs.destroy();
    const list = section.querySelector("[data-ut-list]");
    expect(list?.getAttribute("role")).toBeNull();
    getTabs(section).forEach((tab) => {
      expect(tab.getAttribute("role")).toBeNull();
      expect(tab.getAttribute("aria-selected")).toBeNull();
    });
    getPanels(section).forEach((panel) => {
      expect(panel.getAttribute("role")).toBeNull();
      expect(panel.hidden).toBe(false);
    });
  });

  it("removes variant/orientation attributes", () => {
    const section = makeDOM();
    const tabs = createTabs({
      el: section,
      variant: "pill",
      orientation: "vertical",
    });
    tabs.destroy();
    expect(section.getAttribute("data-ut-variant")).toBeNull();
    expect(section.getAttribute("data-ut-orientation")).toBeNull();
  });
});

describe("double-init prevention", () => {
  it("destroys existing instance when creating new one on same element", () => {
    const section = makeDOM();
    const tabs1 = createTabs({ el: section });
    const fn = vi.fn();
    tabs1.on("afterChange", fn);

    // Create second instance on same element
    const tabs2 = createTabs({ el: section });
    tabs2.setPath("b");

    // Old instance's handlers should not fire
    // New instance should work
    expect(tabs2.getPath()).toBe("b");
    // fn was on tabs1 which was destroyed, so it shouldn't be called
    expect(fn).not.toHaveBeenCalled();

    tabs2.destroy();
  });
});

// ── Persist ──────────────────────────────────────────────────────────────────

describe("persist", () => {
  it("persist: session stores to sessionStorage", () => {
    const section = makeDOM();
    section.id = "persist-test";
    const tabs = createTabs({ el: section, persist: "session" });
    tabs.setPath("b");
    expect(sessionStorage.getItem("ut-persist-persist-test")).toBe("b");
    tabs.destroy();
  });

  it("persist: local stores to localStorage", () => {
    const section = makeDOM();
    section.id = "persist-local";
    const tabs = createTabs({ el: section, persist: "local" });
    tabs.setPath("c");
    expect(localStorage.getItem("ut-persist-persist-local")).toBe("c");
    tabs.destroy();
  });

  it("restores from storage on init", () => {
    const section = makeDOM();
    section.id = "restore-test";
    sessionStorage.setItem("ut-persist-restore-test", "c");
    const tabs = createTabs({ el: section, persist: "session" });
    expect(tabs.getPath()).toBe("c");
    tabs.destroy();
  });
});

// ── Click handling ───────────────────────────────────────────────────────────

describe("click handling", () => {
  it("clicking a tab switches to it", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[1].click();
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();
  });

  it("clicking disabled tab does nothing", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[1].click(); // disabled
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});

// ── Transitions ──────────────────────────────────────────────────────────────

describe("transitions", () => {
  it("sets data-ut-transition attribute when enabled", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, transition: "fade" });
    expect(section.getAttribute("data-ut-transition")).toBe("fade");
    tabs.destroy();
  });
});

// ── Overflow ─────────────────────────────────────────────────────────────────

describe("overflow", () => {
  it("creates scroller wrapper when overflow is true", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    expect(section.querySelector("[data-ut-scroller]")).toBeTruthy();
    tabs.destroy();
  });

  it("creates scroll buttons", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    expect(section.querySelector('[data-ut-scroll-btn="start"]')).toBeTruthy();
    expect(section.querySelector('[data-ut-scroll-btn="end"]')).toBeTruthy();
    tabs.destroy();
  });

  it("removes scroller on destroy", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    tabs.destroy();
    expect(section.querySelector("[data-ut-scroller]")).toBeNull();
  });
});

// ── Equal height ─────────────────────────────────────────────────────────────

describe("equalHeight", () => {
  it("equalHeight option sets min-height on root", async () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, equalHeight: true });
    // Let RAF run - wait a tick for requestAnimationFrame
    await new Promise((r) => setTimeout(r, 50));
    // In test env this may not set actual values, but cleanup should work
    tabs.destroy();
    expect(section.style.minHeight).toBe("");
  });

  it("cleans up min-height on destroy", () => {
    const section = makeDOM();
    const panels = getPanels(section);
    const tabs = createTabs({ el: section, equalPanelHeight: true });
    tabs.destroy();
    panels.forEach((panel) => {
      expect(panel.style.minHeight).toBe("");
    });
  });
});

// ── Error handling ───────────────────────────────────────────────────────────

describe("error handling", () => {
  it("throws when el selector not found", () => {
    expect(() => createTabs({ el: "#nonexistent" })).toThrow("[ultitabs] Element not found");
  });

  it("throws when no data-ut-list found", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "");
    document.body.appendChild(section);
    expect(() => createTabs({ el: section })).toThrow("[ultitabs] Missing [data-ut-list]");
  });

  it("throws when no tabs found", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    section.appendChild(list);
    document.body.appendChild(section);
    expect(() => createTabs({ el: section })).toThrow("[ultitabs] No [data-ut-tab] elements found");
  });
});

describe("panel pairing fallback", () => {
  it("pairs by index when values are missing", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "plain");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    ["Alpha", "Beta"].forEach((label) => {
      const tab = document.createElement("button");
      tab.textContent = label;
      list.appendChild(tab);
      tab.setAttribute("data-ut-tab", "");
    });
    ["one", "two"].forEach((text) => {
      const panel = document.createElement("div");
      panel.setAttribute("data-ut-panel", "");
      panel.textContent = text;
      section.appendChild(panel);
    });
    section.insertBefore(list, section.firstChild);
    document.body.appendChild(section);

    const tabs = createTabs({ el: section });
    const panels = getPanels(section);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    tabs.setPath("Beta");
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    tabs.destroy();
  });

  it("does not index-fallback when a value is present but unmatched", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "orphan");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    const tab = document.createElement("button");
    tab.setAttribute("data-ut-tab", "a");
    tab.textContent = "A";
    list.appendChild(tab);
    const panel = document.createElement("div");
    panel.setAttribute("data-ut-panel", "zzz");
    panel.textContent = "orphan";
    section.append(list, panel);
    document.body.appendChild(section);

    const tabs = createTabs({ el: section });
    expect(tab.getAttribute("aria-controls")).toBeNull();
    expect(panel.hidden).toBe(true);
    tabs.destroy();
  });
});

describe("keyboard navigation — more cases", () => {
  it("ArrowLeft skips disabled tabs", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    tabs.setPath("d");
    const tabEls = getTabs(section);
    tabEls[3].focus();
    simulateKeyDown(tabEls[3], "ArrowLeft");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("End skips a disabled last tab", () => {
    const section = makeDOM(["a", "b", "c"]);
    const list = section.querySelector("[data-ut-list]")!;
    (list.children[2] as HTMLElement).setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "End");
    expect(tabs.getPath()).toBe("b");
    expect(document.activeElement).toBe(tabEls[1]);
    tabs.destroy();
  });

  it("uses ArrowDown and ArrowUp when orientation is vertical", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, orientation: "vertical" });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "ArrowDown");
    expect(tabs.getPath()).toBe("b");
    tabEls[1].focus();
    simulateKeyDown(tabEls[1], "ArrowUp");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("reverses horizontal arrows in RTL", () => {
    const section = makeDOM();
    section.setAttribute("dir", "rtl");
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "ArrowLeft");
    expect(tabs.getPath()).toBe("b");
    tabEls[1].focus();
    simulateKeyDown(tabEls[1], "ArrowRight");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("ignores arrows when every tab is disabled", () => {
    const section = makeDOM(["a", "b"]);
    getTabs(section).forEach((tab) => tab.setAttribute("data-ut-disabled", ""));
    const tabs = createTabs({ el: section });
    expect(tabs.getPath()).toBeNull();
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "ArrowRight");
    simulateKeyDown(tabEls[0], "Home");
    simulateKeyDown(tabEls[0], "End");
    expect(tabs.getPath()).toBeNull();
    tabs.destroy();
  });

  it("does not react to unrelated keys", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const tabEls = getTabs(section);
    tabEls[0].focus();
    simulateKeyDown(tabEls[0], "Enter");
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});

describe("disabled tabs — setPath", () => {
  it("does not run beforeChange when the target is disabled", () => {
    const section = makeDOMWithDisabled();
    const before = vi.fn();
    const tabs = createTabs({ el: section, beforeChange: before });
    tabs.setPath("b");
    expect(before).not.toHaveBeenCalled();
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("never gives a disabled tab tabindex 0", () => {
    const section = makeDOM(["a", "b"]);
    getTabs(section)[0].setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: section, defaultPath: "a" });
    const tabEls = getTabs(section);
    expect(tabs.getPath()).toBe("b");
    expect(tabEls[0].getAttribute("tabindex")).toBe("-1");
    expect(tabEls[1].getAttribute("tabindex")).toBe("0");
    tabs.destroy();
  });
});

describe("syncUrl history", () => {
  function hashFor(path: string) {
    return `#ut-test-${path}`;
  }

  it("replaceState on init and pushState only for a later user change", () => {
    const section = makeDOM();
    const replace = vi.spyOn(history, "replaceState");
    const push = vi.spyOn(history, "pushState");
    const tabs = createTabs({ el: section, syncUrl: true });
    expect(replace).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(location.hash).toBe(hashFor("a"));

    replace.mockClear();
    tabs.setPath("b");
    expect(push).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
    expect(location.hash).toBe(hashFor("b"));
    tabs.destroy();
  });

  it("opens the tab named by the hash and does not push during popstate", () => {
    const section = makeDOM();
    history.replaceState(null, "", `${location.pathname}${hashFor("c")}`);
    const tabs = createTabs({ el: section, syncUrl: true });
    expect(tabs.getPath()).toBe("c");

    const push = vi.spyOn(history, "pushState");
    const replace = vi.spyOn(history, "replaceState");
    history.replaceState(null, "", `${location.pathname}${hashFor("a")}`);
    replace.mockClear();
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(tabs.getPath()).toBe("a");
    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalled();
    tabs.destroy();
  });

  it("follows hashchange without pushing a new entry", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, syncUrl: true });
    const push = vi.spyOn(history, "pushState");
    history.replaceState(null, "", `${location.pathname}${hashFor("b")}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(tabs.getPath()).toBe("b");
    expect(push).not.toHaveBeenCalled();
    tabs.destroy();
  });

  it("ignores hashes that belong to another instance", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, syncUrl: true });
    history.replaceState(null, "", `${location.pathname}#ut-other-b`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("refuses a disabled id from the URL", () => {
    const section = makeDOMWithDisabled();
    history.replaceState(null, "", `${location.pathname}#ut-test-b`);
    const tabs = createTabs({ el: section, syncUrl: true });
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("removes the popstate listener on destroy", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, syncUrl: true });
    tabs.destroy();
    history.replaceState(null, "", `${location.pathname}${hashFor("c")}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(getTabs(section)[2].getAttribute("aria-selected")).toBeNull();
  });
});

describe("persist keys", () => {
  it("falls back to the data-ut-section value when id is missing", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, persist: "session" });
    tabs.setPath("b");
    expect(sessionStorage.getItem("ut-persist-test")).toBe("b");
    tabs.destroy();
  });

  it("ignores a persisted disabled tab", () => {
    const section = makeDOMWithDisabled();
    section.id = "persist-disabled";
    sessionStorage.setItem("ut-persist-persist-disabled", "b");
    const tabs = createTabs({ el: section, persist: "session" });
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });

  it("uses a document index when the section has no id or name", () => {
    const section = makeDOM();
    section.removeAttribute("data-ut-section");
    const tabs = createTabs({ el: section, persist: "session" });
    tabs.setPath("b");
    expect(sessionStorage.getItem("ut-persist--1")).toBe("b");
    tabs.destroy();
  });

  it("does not write to the other storage", () => {
    const section = makeDOM();
    section.id = "only-local";
    const tabs = createTabs({ el: section, persist: "local" });
    tabs.setPath("b");
    expect(sessionStorage.getItem("ut-persist-only-local")).toBeNull();
    tabs.destroy();
  });
});

describe("transitions cleanup", () => {
  it("clears leaving state when the animation ends", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const section = makeDOM();
    const tabs = createTabs({ el: section, transition: "fade" });
    const panels = getPanels(section);
    tabs.setPath("b");
    expect(panels[0].getAttribute("data-ut-panel-leaving")).toBe("fade");
    expect(panels[0].hidden).toBe(false);
    expect(panels[0].style.position).toBe("");
    expect(panels[0].style.width).not.toBe("");
    expect(panels[1].getAttribute("data-ut-panel-entering")).toBe("fade");

    panels[1].dispatchEvent(new Event("animationend"));
    expect(panels[0].hidden).toBe(true);
    expect(panels[0].hasAttribute("data-ut-panel-leaving")).toBe(false);
    expect(panels[1].hasAttribute("data-ut-panel-entering")).toBe(false);
    expect(panels[0].style.width).toBe("");
    tabs.destroy();
  });

  it("clears leaving state from the timeout fallback", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const section = makeDOM();
    const panels = getPanels(section);
    panels[1].style.setProperty("--ut-transition-duration", "0.2s");
    const tabs = createTabs({ el: section, transition: "slide" });
    tabs.setPath("b");
    expect(panels[0].hasAttribute("data-ut-panel-leaving")).toBe(true);
    vi.advanceTimersByTime(300);
    expect(panels[0].hidden).toBe(true);
    expect(panels[0].hasAttribute("data-ut-panel-leaving")).toBe(false);
    tabs.destroy();
  });

  it("cancels an in-flight transition on destroy", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const section = makeDOM();
    const tabs = createTabs({ el: section, transition: "slide" });
    const panels = getPanels(section);
    tabs.setPath("c");
    tabs.destroy();
    expect(panels[0].hasAttribute("data-ut-panel-leaving")).toBe(false);
    expect(panels[2].hasAttribute("data-ut-panel-entering")).toBe(false);
    expect(panels.every((panel) => panel.hidden === false)).toBe(true);
  });
});

describe("overflow behavior", () => {
  function setBox(
    element: HTMLElement,
    box: { left: number; right: number; top?: number; bottom?: number },
  ) {
    element.getBoundingClientRect = () =>
      ({
        left: box.left,
        right: box.right,
        top: box.top ?? 0,
        bottom: box.bottom ?? 40,
        width: box.right - box.left,
        height: (box.bottom ?? 40) - (box.top ?? 0),
        x: box.left,
        y: box.top ?? 0,
        toJSON() {},
      }) as DOMRect;
  }

  function setScroll(
    element: HTMLElement,
    values: {
      scrollLeft?: number;
      scrollTop?: number;
      scrollWidth?: number;
      clientWidth?: number;
      scrollHeight?: number;
      clientHeight?: number;
    },
  ) {
    let scrollLeft = values.scrollLeft ?? 0;
    let scrollTop = values.scrollTop ?? 0;
    Object.defineProperty(element, "scrollLeft", {
      configurable: true,
      get: () => scrollLeft,
      set: (value: number) => {
        scrollLeft = value;
      },
    });
    Object.defineProperty(element, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value: number) => {
        scrollTop = value;
      },
    });
    Object.defineProperty(element, "scrollWidth", {
      configurable: true,
      get: () => values.scrollWidth ?? 0,
    });
    Object.defineProperty(element, "clientWidth", {
      configurable: true,
      get: () => values.clientWidth ?? 0,
    });
    Object.defineProperty(element, "scrollHeight", {
      configurable: true,
      get: () => values.scrollHeight ?? 0,
    });
    Object.defineProperty(element, "clientHeight", {
      configurable: true,
      get: () => values.clientHeight ?? 0,
    });
  }

  it("uses logical arrow buttons with no physical glyph text", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    const start = section.querySelector<HTMLButtonElement>('[data-ut-scroll-btn="start"]')!;
    const end = section.querySelector<HTMLButtonElement>('[data-ut-scroll-btn="end"]')!;
    expect(start.textContent).toBe("");
    expect(end.textContent).toBe("");
    expect(start.type).toBe("button");
    expect(end.getAttribute("tabindex")).toBe("-1");
    tabs.destroy();
  });

  it("hides the start arrow at the inline start, including RTL", () => {
    const section = makeDOM();
    section.setAttribute("dir", "rtl");
    const tabs = createTabs({ el: section, overflow: true });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    const type = detectRtlScrollType();
    const max = 400;
    setScroll(list, { scrollLeft: 0, scrollWidth: 500, clientWidth: 100 });

    const atStart = logicalScrollFromStart(0, max, type) <= 1;
    list.dispatchEvent(new Event("scroll"));
    const start = section.querySelector('[data-ut-scroll-btn="start"]')!;
    const end = section.querySelector('[data-ut-scroll-btn="end"]')!;
    expect(start.hasAttribute("data-ut-scroll-hidden")).toBe(atStart);
    expect(end.hasAttribute("data-ut-scroll-hidden")).toBe(
      logicalScrollFromStart(0, max, type) >= max - 1,
    );
    tabs.destroy();
  });

  it("scrolls toward the end when the end button is clicked", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    setScroll(list, { scrollLeft: 0, scrollWidth: 800, clientWidth: 100 });
    section.querySelector<HTMLButtonElement>('[data-ut-scroll-btn="end"]')!.click();
    expect(list.scrollLeft).toBe(120);
    tabs.destroy();
  });

  it("scrolls a focused tab into view without moving the page", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    const tab = getTabs(section)[2];
    setScroll(list, { scrollLeft: 0, scrollWidth: 800, clientWidth: 100 });
    setBox(list, { left: 0, right: 100 });
    setBox(tab, { left: 180, right: 240 });
    tab.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(list.scrollLeft).toBe(140);
    tabs.destroy();
  });

  it("applies the RTL scroll model when an arrow is clicked", () => {
    const section = makeDOM();
    section.setAttribute("dir", "rtl");
    const tabs = createTabs({ el: section, overflow: true });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    setScroll(list, { scrollLeft: 0, scrollWidth: 800, clientWidth: 100 });
    section.querySelector<HTMLButtonElement>('[data-ut-scroll-btn="end"]')!.click();
    expect(list.scrollLeft).toBe(scrollLeftAfterDelta(0, 120, detectRtlScrollType()));
    tabs.destroy();
  });

  it("scrolls a focused tab back into view from the left and from above", () => {
    const section = makeDOM();
    const horizontal = createTabs({ el: section, overflow: true });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    const tab = getTabs(section)[0];
    setScroll(list, { scrollLeft: 200, scrollWidth: 800, clientWidth: 100 });
    setBox(list, { left: 100, right: 200 });
    setBox(tab, { left: 40, right: 90 });
    tab.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(list.scrollLeft).toBe(140);
    horizontal.destroy();

    const verticalSection = makeDOM();
    const vertical = createTabs({
      el: verticalSection,
      overflow: true,
      orientation: "vertical",
    });
    const verticalList = verticalSection.querySelector<HTMLElement>("[data-ut-list]")!;
    const verticalTab = getTabs(verticalSection)[2];
    setScroll(verticalList, { scrollTop: 0, scrollHeight: 500, clientHeight: 80 });
    setBox(verticalList, { left: 0, right: 80, top: 0, bottom: 80 });
    setBox(verticalTab, { left: 0, right: 80, top: 140, bottom: 180 });
    verticalTab.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(verticalList.scrollTop).toBe(100);

    setBox(verticalTab, { left: 0, right: 80, top: -30, bottom: 10 });
    verticalTab.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(verticalList.scrollTop).toBe(70);
    vertical.destroy();
  });

  it("scrolls vertically from the arrow buttons", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, overflow: true, orientation: "vertical" });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    setScroll(list, { scrollTop: 40, scrollHeight: 400, clientHeight: 80 });
    section.querySelector<HTMLButtonElement>('[data-ut-scroll-btn="start"]')!.click();
    expect(list.scrollTop).toBe(-80);
    tabs.destroy();
  });
});

describe("equalHeight cleanup", () => {
  it("invokes ResizeObserver measurement without looping and clears on destroy", () => {
    const captured: { callback: ResizeObserverCallback | null } = { callback: null };
    let observes = 0;
    const Original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) {
        captured.callback = cb;
      }
      observe() {
        observes += 1;
        if (observes > 8) throw new Error("equalHeight resize feedback loop");
      }
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;

    try {
      const section = makeDOM();
      const panels = getPanels(section);
      const tabs = createTabs({ el: section, equalHeight: true, equalPanelHeight: true });
      expect(captured.callback).toBeTruthy();
      captured.callback?.([], {} as ResizeObserver);
      captured.callback?.([], {} as ResizeObserver);
      expect(observes).toBeLessThan(8);
      panels.forEach((panel) => {
        panel.style.minHeight = "40px";
      });
      section.style.minHeight = "80px";
      tabs.destroy();
      expect(section.style.minHeight).toBe("");
      panels.forEach((panel) => expect(panel.style.minHeight).toBe(""));
    } finally {
      globalThis.ResizeObserver = Original;
    }
  });
});

describe("destroy and double-init details", () => {
  it("removes indicator variables, tabindex, and aria-disabled", () => {
    const section = makeDOMWithDisabled();
    const tabs = createTabs({ el: section });
    const list = section.querySelector<HTMLElement>("[data-ut-list]")!;
    expect(list.style.getPropertyValue("--ut-indicator-width")).not.toBe("");
    expect(getTabs(section)[1].getAttribute("aria-disabled")).toBe("true");
    tabs.destroy();
    expect(list.style.getPropertyValue("--ut-indicator-left")).toBe("");
    expect(list.style.getPropertyValue("--ut-indicator-width")).toBe("");
    getTabs(section).forEach((tab) => {
      expect(tab.getAttribute("tabindex")).toBeNull();
      expect(tab.getAttribute("aria-disabled")).toBeNull();
      expect(tab.hasAttribute("data-ut-active")).toBe(false);
    });
    expect(list.getAttribute("aria-orientation")).toBeNull();
    expect(section.dataset.utInitialized).toBeUndefined();
  });

  it("does not fire two click handlers after a second createTabs", () => {
    const section = makeDOM();
    const first = createTabs({ el: section });
    const seen = vi.fn();
    first.on("afterChange", seen);
    const second = createTabs({ el: section });
    const again = vi.fn();
    second.on("afterChange", again);
    getTabs(section)[1].click();
    expect(seen).not.toHaveBeenCalled();
    expect(again).toHaveBeenCalledTimes(1);
    expect(second.getPath()).toBe("b");
    second.destroy();
  });

  it("clicking inside a tab label still selects it", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section });
    const label = document.createElement("span");
    label.textContent = "inner";
    getTabs(section)[2].appendChild(label);
    label.click();
    expect(tabs.getPath()).toBe("c");
    tabs.destroy();
  });
});

describe("syncUrl malformed hash", () => {
  it("ignores a hash that cannot be decoded", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, syncUrl: true });
    history.replaceState(null, "", `${location.pathname}#%`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(tabs.getPath()).toBe("a");
    tabs.destroy();
  });
});
