/**
 * Behavior that pages written for ultitabs 1.5.0 depend on.
 * These cases must keep passing for a minor upgrade.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../package.json";
import { createTabs } from "./tabs";

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

function tabsOf(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll("[data-ut-tab]"));
}

function panelsOf(section: HTMLElement): HTMLElement[] {
  return Array.from(section.querySelectorAll("[data-ut-panel]"));
}

afterEach(() => {
  document.body.innerHTML = "";
  history.replaceState(null, "", location.pathname);
  sessionStorage.clear();
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("1.5 onChange", () => {
  it("runs after beforeChange, can cancel, and warns once outside production", async () => {
    vi.resetModules();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { createTabs: fresh } = await import("./tabs");
    const section = makeDOM();
    const order: string[] = [];
    const tabs = fresh({
      el: section,
      beforeChange: () => {
        order.push("beforeChange");
      },
      onChange: (path, prev) => {
        order.push(`onChange:${path}:${prev}`);
        return false;
      },
    });
    tabs.on("beforeChange", () => {
      order.push("listener");
    });
    const after = vi.fn();
    tabs.on("afterChange", after);

    tabs.setPath("b");
    expect(tabs.getPath()).toBe("a");
    expect(order).toEqual(["beforeChange", "onChange:b:a"]);
    expect(after).not.toHaveBeenCalled();

    const second = fresh({ el: makeDOM(["x", "y"]), onChange: () => undefined });
    second.setPath("y");
    expect(second.getPath()).toBe("y");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("deprecated");
    tabs.destroy();
    second.destroy();
  });

  it("stays silent in production", async () => {
    vi.resetModules();
    const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
      .process.env;
    const previous = env.NODE_ENV;
    env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { createTabs: fresh } = await import("./tabs");
      const tabs = fresh({ el: makeDOM(), onChange: () => undefined });
      tabs.setPath("b");
      expect(tabs.getPath()).toBe("b");
      expect(warn).not.toHaveBeenCalled();
      tabs.destroy();
    } finally {
      env.NODE_ENV = previous;
    }
  });
});

describe("1.5 panel pairing", () => {
  it("pairs by index when tab and panel values do not match", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "legacy");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    ["a", "b"].forEach((id) => {
      const tab = document.createElement("button");
      tab.setAttribute("data-ut-tab", id);
      tab.textContent = id;
      list.appendChild(tab);
    });
    ["x", "y"].forEach((id) => {
      const panel = document.createElement("div");
      panel.setAttribute("data-ut-panel", id);
      panel.textContent = id;
      section.appendChild(panel);
    });
    section.insertBefore(list, section.firstChild);
    document.body.appendChild(section);

    const tabs = createTabs({ el: section });
    const panels = panelsOf(section);
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    tabs.setPath("b");
    expect(panels[0].hidden).toBe(true);
    expect(panels[1].hidden).toBe(false);
    tabs.destroy();
  });

  it("pairs by index when values are missing", () => {
    const section = document.createElement("div");
    section.setAttribute("data-ut-section", "legacy");
    const list = document.createElement("div");
    list.setAttribute("data-ut-list", "");
    ["One", "Two"].forEach((label) => {
      const tab = document.createElement("button");
      tab.setAttribute("data-ut-tab", "");
      tab.textContent = label;
      list.appendChild(tab);
      const panel = document.createElement("div");
      panel.setAttribute("data-ut-panel", "");
      panel.textContent = label;
      section.appendChild(panel);
    });
    section.insertBefore(list, section.firstChild);
    document.body.appendChild(section);

    const tabs = createTabs({ el: section });
    const panels = panelsOf(section);
    expect(tabs.getPath()).toBe("One");
    expect(panels[0].hidden).toBe(false);
    tabs.setPath("Two");
    expect(panels[1].hidden).toBe(false);
    tabs.destroy();
  });
});

describe("1.5 hash and storage keys", () => {
  it("writes #ut-{id}-{path}", () => {
    const section = makeDOM();
    section.id = "billing";
    const tabs = createTabs({ el: section, syncUrl: true });
    tabs.setPath("b");
    expect(location.hash).toBe("#ut-billing-b");
    tabs.destroy();
  });

  it("writes #ut-{section}-{path} when there is no id", () => {
    const section = makeDOM();
    section.setAttribute("data-ut-section", "account");
    const tabs = createTabs({ el: section, syncUrl: true });
    tabs.setPath("c");
    expect(location.hash).toBe("#ut-account-c");
    tabs.destroy();
  });

  it("writes #ut-tab-{path} when id and section are missing", () => {
    const section = makeDOM();
    section.removeAttribute("data-ut-section");
    const tabs = createTabs({ el: section, syncUrl: true });
    tabs.setPath("b");
    expect(location.hash).toBe("#ut-tab-b");
    tabs.destroy();
  });

  it("keeps ut-persist-{id}, {section}, and {index} keys", () => {
    const byId = makeDOM();
    byId.id = "saved";
    const idTabs = createTabs({ el: byId, persist: "local" });
    idTabs.setPath("b");
    expect(localStorage.getItem("ut-persist-saved")).toBe("b");
    idTabs.destroy();

    const bySection = makeDOM();
    bySection.setAttribute("data-ut-section", "profile");
    const sectionTabs = createTabs({ el: bySection, persist: "session" });
    sectionTabs.setPath("c");
    expect(sessionStorage.getItem("ut-persist-profile")).toBe("c");
    sectionTabs.destroy();

    document.body.innerHTML = "";
    const bare = makeDOM();
    bare.removeAttribute("data-ut-section");
    const bareTabs = createTabs({ el: bare, persist: "session" });
    bareTabs.setPath("b");
    expect(sessionStorage.getItem("ut-persist--1")).toBe("b");
    bareTabs.destroy();
  });

  it("uses defaultPath, then data-ut-default, then the hash, then storage", () => {
    const preferred = makeDOM();
    preferred.id = "priority";
    history.replaceState(null, "", `${location.pathname}#ut-priority-b`);
    localStorage.setItem("ut-persist-priority", "c");
    const fromConfig = createTabs({
      el: preferred,
      syncUrl: true,
      persist: "local",
      defaultPath: "a",
    });
    expect(fromConfig.getPath()).toBe("a");
    fromConfig.destroy();

    document.body.innerHTML = "";
    history.replaceState(null, "", location.pathname);
    const fromAttribute = makeDOM();
    fromAttribute.id = "attr";
    fromAttribute.setAttribute("data-ut-default", "c");
    history.replaceState(null, "", `${location.pathname}#ut-attr-b`);
    const attributeTabs = createTabs({ el: fromAttribute, syncUrl: true, persist: "local" });
    expect(attributeTabs.getPath()).toBe("c");
    attributeTabs.destroy();

    document.body.innerHTML = "";
    const fromHash = makeDOM();
    fromHash.id = "hashed";
    localStorage.setItem("ut-persist-hashed", "c");
    history.replaceState(null, "", `${location.pathname}#ut-hashed-b`);
    const hashTabs = createTabs({ el: fromHash, syncUrl: true, persist: "local" });
    expect(hashTabs.getPath()).toBe("b");
    hashTabs.destroy();

    document.body.innerHTML = "";
    history.replaceState(null, "", location.pathname);
    const fromStorage = makeDOM();
    fromStorage.id = "stored";
    sessionStorage.setItem("ut-persist-stored", "c");
    const storedTabs = createTabs({ el: fromStorage, persist: "session" });
    expect(storedTabs.getPath()).toBe("c");
    storedTabs.destroy();
  });
});

describe("1.5 disabled and getPath", () => {
  it("returns a string and selects a disabled id from setPath, storage, or the hash", () => {
    const section = makeDOM();
    tabsOf(section)[1].setAttribute("data-ut-disabled", "");
    section.id = "disabled-path";
    sessionStorage.setItem("ut-persist-disabled-path", "b");
    const restored = createTabs({ el: section, persist: "session" });
    expect(typeof restored.getPath()).toBe("string");
    expect(restored.getPath()).toBe("b");
    restored.destroy();

    document.body.innerHTML = "";
    const clicked = makeDOM();
    tabsOf(clicked)[1].setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: clicked });
    tabsOf(clicked)[1].click();
    expect(tabs.getPath()).toBe("a");
    tabs.setPath("b");
    expect(tabs.getPath()).toBe("b");
    tabs.destroy();

    document.body.innerHTML = "";
    history.replaceState(null, "", `${location.pathname}#ut-from-url-b`);
    const fromUrl = makeDOM();
    fromUrl.id = "from-url";
    tabsOf(fromUrl)[1].setAttribute("data-ut-disabled", "");
    const urlTabs = createTabs({ el: fromUrl, syncUrl: true });
    expect(urlTabs.getPath()).toBe("b");
    urlTabs.destroy();
  });

  it("still skips disabled tabs from the keyboard", () => {
    const section = makeDOM();
    tabsOf(section)[1].setAttribute("data-ut-disabled", "");
    const tabs = createTabs({ el: section });
    const first = tabsOf(section)[0];
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(tabs.getPath()).toBe("c");
    tabs.destroy();
  });
});

describe("1.5 destroy and package paths", () => {
  it("leaves the last visible tab state in the document", () => {
    const section = makeDOM();
    const tabs = createTabs({ el: section, variant: "underline" });
    tabs.setPath("b");
    tabs.destroy();
    expect(section.querySelector("[data-ut-list]")?.getAttribute("role")).toBe("tablist");
    expect(tabsOf(section)[1].getAttribute("aria-selected")).toBe("true");
    expect(panelsOf(section)[1].hidden).toBe(false);
    expect(panelsOf(section)[0].hidden).toBe(true);
    expect(section.getAttribute("data-ut-variant")).toBe("underline");
    tabsOf(section)[2].click();
    expect(tabsOf(section)[1].getAttribute("aria-selected")).toBe("true");
    expect(panelsOf(section)[1].hidden).toBe(false);
  });

  it("keeps the 1.5 entry points and adds the minified stylesheet", () => {
    expect(packageJson.main).toBe("./dist/index.cjs");
    expect(packageJson.module).toBe("./dist/index.mjs");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      import: "./dist/index.mjs",
      require: "./dist/index.cjs",
    });
    expect(packageJson.exports["./css"]).toBe("./css/ultitabs.css");
    expect(packageJson.exports["./css/ultitabs.min.css"]).toBe("./css/ultitabs.min.css");
  });
});
