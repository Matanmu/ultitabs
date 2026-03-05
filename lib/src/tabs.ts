import type { TabPath, TabsConfig, TabsInstance, TabSection } from "./types";
import { resolveElement } from "./utils";
import { setupAria, updateAriaSelection, setupKeyboard } from "./aria";
import { updateIndicator, updateIndicatorNextFrame, observeResize } from "./indicator";

type ChangeHandler = (path: TabPath, prevPath: TabPath | null) => void;

export function createTabs(config: TabsConfig): TabsInstance {
  const {
    orientation = "horizontal",
    variant = "underline",
    justify = "start",
    side = "left",
    syncUrl = false,
    persist,
    onChange,
  } = config;

  const root = resolveElement(config.el);
  const section = discoverDOM(root);
  const { list, tabs, panels } = section;

  // Set variant, orientation, justify, side
  root.setAttribute("data-ut-variant", variant);
  root.setAttribute("data-ut-orientation", orientation);
  root.setAttribute("data-ut-side", side);
  list.setAttribute("aria-orientation", orientation);
  list.setAttribute("data-ut-justify", justify);

  // Setup ARIA — also marks disabled tabs
  setupAria(section);
  markDisabledTabs(tabs);

  // State
  let currentPath: TabPath | null = null;
  const listeners: Set<ChangeHandler> = new Set();
  if (onChange) listeners.add(onChange);

  // Persist storage key — scoped to element id or a generated key
  const storageKey = `ut-persist-${root.id || root.getAttribute("data-ut-section") || Array.from(document.querySelectorAll("[data-ut-section]")).indexOf(root)}`;
  const storage = persist === "local" ? localStorage : persist === "session" ? sessionStorage : null;

  // Determine initial path — priority: config > URL hash > persisted > data-ut-default > first tab
  const defaultPath = config.defaultPath ?? root.getAttribute("data-ut-default") ?? undefined;
  const urlPath = syncUrl ? getHashPath(root) : null;
  const persistedPath = storage ? storage.getItem(storageKey) : null;
  const initialPath = defaultPath ?? urlPath ?? persistedPath ?? getTabPath(enabledTabs(tabs)[0] ?? tabs[0]);

  // Click handlers
  function handleClick(e: MouseEvent) {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-ut-tab]");
    if (!tab || !tabs.includes(tab)) return;
    if (tab.hasAttribute("data-ut-disabled")) return;
    setPath(getTabPath(tab));
  }
  list.addEventListener("click", handleClick);

  // Keyboard — skip disabled tabs
  const cleanupKeyboard = setupKeyboard(list, tabs, orientation, (index) => {
    const tab = tabs[index];
    if (tab.hasAttribute("data-ut-disabled")) return;
    setPath(getTabPath(tab));
  });

  // ResizeObserver for indicator
  const cleanupResize = observeResize(list, tabs, () =>
    tabs.findIndex((t) => getTabPath(t) === currentPath)
  );

  // URL hash sync — listen for popstate (back/forward)
  function handlePopState() {
    const path = getHashPath(root);
    if (path && path !== currentPath) setPath(path);
  }
  if (syncUrl) window.addEventListener("popstate", handlePopState);

  // Cancel any pending initial-mount RAF on destroy
  let cancelInitialRaf: (() => void) | null = null;

  // API
  function getPath(): TabPath {
    return currentPath!;
  }

  function setPath(path: TabPath, defer = false): void {
    const prevPath = currentPath;
    if (path === prevPath) return;

    const index = tabs.findIndex((t) => getTabPath(t) === path);
    if (index === -1) return;

    currentPath = path;
    updateAriaSelection(tabs, panels, index);

    if (defer) {
      cancelInitialRaf?.();
      cancelInitialRaf = updateIndicatorNextFrame(list, tabs[index]);
    } else {
      updateIndicator(list, tabs[index]);
    }

    // Persist
    if (storage) storage.setItem(storageKey, path);

    // URL sync
    if (syncUrl) {
      const url = new URL(window.location.href);
      url.hash = `ut-${getTabId(root)}-${path}`;
      history.pushState(null, "", url.toString());
    }

    listeners.forEach((fn) => fn(path, prevPath));
  }

  function destroy(): void {
    list.removeEventListener("click", handleClick);
    cleanupKeyboard();
    cleanupResize();
    cancelInitialRaf?.();
    if (syncUrl) window.removeEventListener("popstate", handlePopState);
    listeners.clear();
  }

  function on(event: "change", handler: ChangeHandler): () => void {
    if (event !== "change") return () => {};
    listeners.add(handler);
    return () => listeners.delete(handler);
  }

  // Initialize — defer to next frame so the DOM is laid out before measuring
  setPath(initialPath, true);

  return { getPath, setPath, destroy, on };
}

function discoverDOM(root: HTMLElement): TabSection {
  const list = root.querySelector<HTMLElement>("[data-ut-list]");
  if (!list) throw new Error("[ultitabs] Missing [data-ut-list] element");

  const tabs = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-ut-tab]"));
  const panels = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-ut-panel]"));

  if (tabs.length === 0) throw new Error("[ultitabs] No [data-ut-tab] elements found");

  return { root, list, tabs, panels };
}

function getTabPath(tab: HTMLElement): TabPath {
  return tab.getAttribute("data-ut-tab") || tab.textContent?.trim() || "";
}

function enabledTabs(tabs: HTMLElement[]): HTMLElement[] {
  return tabs.filter((t) => !t.hasAttribute("data-ut-disabled"));
}

function markDisabledTabs(tabs: HTMLElement[]): void {
  tabs.forEach((tab) => {
    if (tab.hasAttribute("data-ut-disabled")) {
      tab.setAttribute("aria-disabled", "true");
      tab.setAttribute("tabindex", "-1");
    }
  });
}

function getTabId(root: HTMLElement): string {
  return root.id || root.getAttribute("data-ut-section") || "tab";
}

function getHashPath(root: HTMLElement): TabPath | null {
  const prefix = `ut-${getTabId(root)}-`;
  const hash = window.location.hash.slice(1);
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : null;
}