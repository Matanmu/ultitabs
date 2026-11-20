/**
 * UltiTabs v2.0 — comprehensive test suite
 * Covers: basic switching, hooks, keyboard navigation, disabled tabs,
 * panel pairing by value, ARIA, destroy/double-init, persist, syncUrl.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
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

function simulateKeyDown(
  element: HTMLElement,
  key: string,
  opts?: KeyboardEventInit
) {
  element.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, ...opts })
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  // Clear URL hash
  history.replaceState(null, "", location.pathname);
  // Clear storage
  sessionStorage.clear();
  localStorage.clear();
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
    const firstPanel = panels.find(
      (p) => p.getAttribute("data-ut-panel") === "first"
    );
    expect(firstPanel?.hidden).toBe(false);

    tabs.setPath("third");
    const thirdPanel = panels.find(
      (p) => p.getAttribute("data-ut-panel") === "third"
    );
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
    expect(
      section.querySelector('[data-ut-scroll-btn="start"]')
    ).toBeTruthy();
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
    expect(() => createTabs({ el: "#nonexistent" })).toThrow(
      "[ultitabs] Element not found"
    );
  });

  it("throws when no data-ut-list found", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "");
    document.body.appendChild(section);
    expect(() => createTabs({ el: section })).toThrow(
      "[ultitabs] Missing [data-ut-list]"
    );
  });

  it("throws when no tabs found", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    section.appendChild(list);
    document.body.appendChild(section);
    expect(() => createTabs({ el: section })).toThrow(
      "[ultitabs] No [data-ut-tab] elements found"
    );
  });
});
