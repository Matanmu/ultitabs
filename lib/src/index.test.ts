import { afterEach, describe, expect, it, vi } from "vitest";

function makeSection() {
  const section = document.createElement("div");
  section.setAttribute("data-ut-section", "auto");
  section.setAttribute("data-ut-auto", "");
  const list = document.createElement("div");
  list.setAttribute("data-ut-list", "");
  ["a", "b"].forEach((id) => {
    const tab = document.createElement("button");
    tab.setAttribute("data-ut-tab", id);
    tab.textContent = id;
    list.appendChild(tab);
    const panel = document.createElement("div");
    panel.setAttribute("data-ut-panel", id);
    panel.textContent = id;
    section.appendChild(panel);
  });
  section.insertBefore(list, section.firstChild);
  document.body.appendChild(section);
  return section;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
});

describe("auto-init", () => {
  it("initializes [data-ut-auto] once", async () => {
    const section = makeSection();
    const clicks: string[] = [];
    const original = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === "click") clicks.push(type);
      return original.call(this, type, listener, options);
    };

    try {
      vi.resetModules();
      await import("./index");
      expect(section.querySelector("[data-ut-tab]")?.getAttribute("role")).toBe("tab");
      expect(section.querySelector("[data-ut-tab]")?.getAttribute("aria-selected")).toBe("true");
      expect(section.dataset.utInitialized).toBe("1");
      const firstClicks = clicks.length;

      vi.resetModules();
      await import("./index");
      expect(clicks.length).toBe(firstClicks);
    } finally {
      EventTarget.prototype.addEventListener = original;
    }
  });

  it("skips sections that are already marked initialized", async () => {
    const section = makeSection();
    section.dataset.utInitialized = "1";
    vi.resetModules();
    await import("./index");
    expect(section.querySelector("[data-ut-tab]")?.getAttribute("role")).toBeNull();
  });

  it("waits for DOMContentLoaded while the document is loading", async () => {
    const section = makeSection();
    const descriptor = Object.getOwnPropertyDescriptor(document, "readyState");
    Object.defineProperty(document, "readyState", {
      configurable: true,
      get: () => "loading",
    });

    try {
      vi.resetModules();
      await import("./index");
      expect(section.querySelector("[role='tab']")).toBeNull();
      document.dispatchEvent(new Event("DOMContentLoaded"));
      expect(section.querySelector("[data-ut-tab]")?.getAttribute("role")).toBe("tab");
    } finally {
      if (descriptor) Object.defineProperty(document, "readyState", descriptor);
    }
  });
});
