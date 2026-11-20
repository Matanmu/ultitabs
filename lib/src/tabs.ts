import { setupAria, setupKeyboard, updateAriaSelection } from "./aria";
import { observeResize, updateIndicator, updateIndicatorNextFrame } from "./indicator";
import type {
  TabBeforeChangeHandler,
  TabChangeHandler,
  TabPath,
  TabSection,
  TabsConfig,
  TabsInstance,
} from "./types";
import {
  detectRtlScrollType,
  logicalScrollFromStart,
  parseDuration,
  resolveElement,
  scrollLeftAfterDelta,
} from "./utils";

const instances = new WeakMap<HTMLElement, TabsInstance>();
let onChangeWarningShown = false;

function warnOnChangeDeprecated(): void {
  if (onChangeWarningShown) return;
  onChangeWarningShown = true;
  const nodeEnv = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env
    ?.NODE_ENV;
  if (nodeEnv === "production") return;
  console.warn(
    "[ultitabs] `onChange` is deprecated and will be removed in a future major version. Use `beforeChange`.",
  );
}

export function createTabs(config: TabsConfig): TabsInstance {
  const {
    orientation = "horizontal",
    variant = "underline",
    justify = "start",
    side = "left",
    syncUrl = false,
    persist,
    overflow = false,
    transition,
    equalHeight = false,
    equalPanelHeight = false,
    beforeChange,
    afterChange,
    onChange,
  } = config;

  if (onChange) warnOnChangeDeprecated();

  const root = resolveElement(config.el);

  // A second createTabs() on the same root replaces the previous instance
  // instead of stacking another set of listeners.
  const existing = instances.get(root);
  if (existing) existing.destroy();

  const section = discoverDOM(root);
  const { list, tabs, panels, tabPanelMap } = section;

  root.setAttribute("data-ut-variant", variant);
  root.setAttribute("data-ut-orientation", orientation);
  root.setAttribute("data-ut-side", side);
  list.setAttribute("aria-orientation", orientation);
  list.setAttribute("data-ut-justify", justify);
  if (transition) root.setAttribute("data-ut-transition", transition);

  let cleanupOverflow: (() => void) | null = null;
  if (overflow) cleanupOverflow = setupOverflow(list, orientation);

  let cleanupEqualHeight: (() => void) | null = null;
  if (equalHeight || equalPanelHeight) {
    cleanupEqualHeight = setupEqualHeight(root, panels, equalHeight, equalPanelHeight);
  }

  setupAria(section);
  tabs.forEach((tab) => {
    if (!tab.hasAttribute("data-ut-disabled")) return;
    tab.setAttribute("aria-disabled", "true");
    tab.setAttribute("tabindex", "-1");
  });

  let currentPath: TabPath | null = null;
  const listeners = new Set<TabChangeHandler>();
  const beforeListeners = new Set<TabBeforeChangeHandler>();
  const afterListeners = new Set<TabChangeHandler>();

  const storageKey = persistKey(root);
  const storage =
    persist === "local" ? localStorage : persist === "session" ? sessionStorage : null;

  let cancelInitialRaf: (() => void) | null = null;
  let activeTransition: (() => void) | null = null;
  // True while applying a URL that the browser already committed (init, popstate, hashchange).
  let isRestoringHistory = false;

  function writeUrl(path: TabPath, mode: "push" | "replace") {
    const url = new URL(window.location.href);
    url.hash = `ut-${getTabId(root)}-${path}`;
    const next = url.toString();
    if (mode === "replace") history.replaceState(null, "", next);
    else if (window.location.href !== next) history.pushState(null, "", next);
  }

  function restoreFromUrl() {
    const path = getHashPath(root);
    if (!path || path === currentPath) return;
    isRestoringHistory = true;
    const before = currentPath;
    setPath(path);
    isRestoringHistory = false;
    // Unknown hash: put the URL back on the tab that stayed active.
    if (currentPath === before && currentPath && syncUrl) writeUrl(currentPath, "replace");
  }

  function handleClick(event: MouseEvent) {
    const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-ut-tab]");
    if (!tab || !tabs.includes(tab)) return;
    if (tab.hasAttribute("data-ut-disabled")) return;
    setPath(getTabPath(tab));
  }

  list.addEventListener("click", handleClick);

  const cleanupKeyboard = setupKeyboard(list, tabs, orientation, (index) => {
    const tab = tabs[index];
    if (!tab || tab.hasAttribute("data-ut-disabled")) return;
    setPath(getTabPath(tab));
  });

  const cleanupResize = observeResize(list, tabs, () =>
    tabs.findIndex((tab) => getTabPath(tab) === currentPath),
  );

  if (syncUrl) {
    window.addEventListener("popstate", restoreFromUrl);
    window.addEventListener("hashchange", restoreFromUrl);
  }

  function getPath(): TabPath {
    return currentPath ?? "";
  }

  function setPath(path: TabPath, defer = false): void {
    const prevPath = currentPath;
    if (path === prevPath) return;

    const index = tabs.findIndex((tab) => getTabPath(tab) === path);
    if (index === -1) return;

    if (!defer) {
      if (beforeChange?.(path, prevPath) === false) return;
      if (onChange?.(path, prevPath) === false) return;
      for (const fn of beforeListeners) {
        if (fn(path, prevPath) === false) return;
      }
    }

    currentPath = path;

    const prevIndex =
      prevPath === null ? -1 : tabs.findIndex((tab) => getTabPath(tab) === prevPath);
    const prevPanel = prevIndex === -1 ? undefined : tabPanelMap.get(prevIndex);
    const nextPanel = tabPanelMap.get(index);

    updateAriaSelection(tabs, tabPanelMap, panels, index);

    if (transition && prevPanel && nextPanel && prevPanel !== nextPanel) {
      activeTransition?.();
      activeTransition = applyTransitionPanels(prevPanel, nextPanel, transition);
    }

    if (defer) {
      cancelInitialRaf?.();
      cancelInitialRaf = updateIndicatorNextFrame(list, tabs[index]);
    } else {
      updateIndicator(list, tabs[index]);
    }

    if (storage) storage.setItem(storageKey, path);

    if (syncUrl) writeUrl(path, defer || isRestoringHistory ? "replace" : "push");

    if (!defer) {
      listeners.forEach((fn) => fn(path, prevPath));
      afterChange?.(path, prevPath);
      afterListeners.forEach((fn) => fn(path, prevPath));
    }
  }

  function destroy(): void {
    instances.delete(root);

    list.removeEventListener("click", handleClick);
    cleanupKeyboard();
    cleanupResize();
    cleanupOverflow?.();
    cleanupEqualHeight?.();
    cancelInitialRaf?.();
    activeTransition?.();
    activeTransition = null;
    if (syncUrl) {
      window.removeEventListener("popstate", restoreFromUrl);
      window.removeEventListener("hashchange", restoreFromUrl);
    }

    listeners.clear();
    beforeListeners.clear();
    afterListeners.clear();
    // 1.5 left roles, hidden, variant attributes, and indicator variables in
    // place, so a destroyed widget keeps the appearance it had. Listeners,
    // observers, the overflow scroller, and equal-height styles are released.
  }

  function on(event: "beforeChange", handler: TabBeforeChangeHandler): () => void;
  function on(event: "change" | "afterChange", handler: TabChangeHandler): () => void;
  function on(event: string, handler: TabBeforeChangeHandler | TabChangeHandler): () => void {
    if (event === "beforeChange") {
      const beforeHandler = handler as TabBeforeChangeHandler;
      beforeListeners.add(beforeHandler);
      return () => beforeListeners.delete(beforeHandler);
    }
    if (event === "afterChange") {
      const afterHandler = handler as TabChangeHandler;
      afterListeners.add(afterHandler);
      return () => afterListeners.delete(afterHandler);
    }
    const changeHandler = handler as TabChangeHandler;
    listeners.add(changeHandler);
    return () => listeners.delete(changeHandler);
  }

  function off(event: "beforeChange", handler: TabBeforeChangeHandler): void;
  function off(event: "change" | "afterChange", handler: TabChangeHandler): void;
  function off(event: string, handler: TabBeforeChangeHandler | TabChangeHandler): void {
    if (event === "beforeChange") {
      beforeListeners.delete(handler as TabBeforeChangeHandler);
      return;
    }
    if (event === "afterChange") {
      afterListeners.delete(handler as TabChangeHandler);
      return;
    }
    listeners.delete(handler as TabChangeHandler);
  }

  // Same priority as 1.5: config, data-ut-default, URL hash, storage, first enabled tab.
  const defaultPath = config.defaultPath ?? root.getAttribute("data-ut-default") ?? undefined;
  const urlPath = syncUrl ? getHashPath(root) : null;
  const persistedPath = storage ? storage.getItem(storageKey) : null;
  const initialPath =
    defaultPath ??
    urlPath ??
    persistedPath ??
    getTabPath(tabs.find((tab) => !tab.hasAttribute("data-ut-disabled")) ?? tabs[0]);

  if (initialPath) setPath(initialPath, true);

  const instance: TabsInstance = { getPath, setPath, destroy, on, off };
  instances.set(root, instance);
  return instance;
}

function discoverDOM(root: HTMLElement): TabSection {
  const list = root.querySelector<HTMLElement>(":scope > [data-ut-list]");
  if (!list) throw new Error("[ultitabs] Missing [data-ut-list] element");

  const tabs = Array.from(list.querySelectorAll<HTMLElement>(":scope > [data-ut-tab]"));
  const panels = Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-ut-panel]"));

  if (tabs.length === 0) throw new Error("[ultitabs] No [data-ut-tab] elements found");

  return { root, list, tabs, panels, tabPanelMap: pairPanels(tabs, panels) };
}

function pairPanels(tabs: HTMLElement[], panels: HTMLElement[]): Map<number, HTMLElement> {
  const map = new Map<number, HTMLElement>();
  const used = new Set<HTMLElement>();
  const panelsByValue = new Map<string, HTMLElement>();

  panels.forEach((panel) => {
    const value = attributeValue(panel, "data-ut-panel");
    if (value && !panelsByValue.has(value)) panelsByValue.set(value, panel);
  });

  tabs.forEach((tab, index) => {
    const value = attributeValue(tab, "data-ut-tab");
    if (!value) return;
    const panel = panelsByValue.get(value);
    if (!panel || used.has(panel)) return;
    map.set(index, panel);
    used.add(panel);
  });

  // 1.5 paired by index. Tabs whose values are missing or match nothing keep
  // that index so existing pages do not move. A panel already claimed by a
  // real value match is left alone.
  tabs.forEach((_tab, index) => {
    if (map.has(index)) return;
    const panel = panels[index];
    if (!panel || used.has(panel)) return;
    map.set(index, panel);
    used.add(panel);
  });

  return map;
}

function attributeValue(element: HTMLElement, name: string): string | null {
  const value = element.getAttribute(name);
  if (value === null || value === "") return null;
  return value;
}

function getTabPath(tab: HTMLElement | undefined): TabPath {
  if (!tab) return "";
  return attributeValue(tab, "data-ut-tab") || tab.textContent?.trim() || "";
}

function persistKey(root: HTMLElement): string {
  if (root.id) return `ut-persist-${root.id}`;
  const section = root.getAttribute("data-ut-section");
  if (section) return `ut-persist-${section}`;
  const index = Array.from(document.querySelectorAll("[data-ut-section]")).indexOf(root);
  return `ut-persist-${index}`;
}

function getTabId(root: HTMLElement): string {
  return root.id || root.getAttribute("data-ut-section") || "tab";
}

function getHashPath(root: HTMLElement): TabPath | null {
  const prefix = `ut-${getTabId(root)}-`;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  let hash = raw;
  try {
    hash = decodeURIComponent(raw);
  } catch {
    hash = raw;
  }
  return hash.startsWith(prefix) ? hash.slice(prefix.length) : null;
}

// ── Equal height ─────────────────────────────────────────────────────────────

function setupEqualHeight(
  root: HTMLElement,
  panels: HTMLElement[],
  equalHeight: boolean,
  equalPanelHeight: boolean,
): () => void {
  let measuring = false;
  let lastMax = -1;
  let measureFrame = 0;
  let observeFrame = 0;

  function measure() {
    if (measuring) return;
    measuring = true;
    observer.unobserve(root);

    const width = panelWidth(root, panels);
    const max = Math.max(0, ...panels.map((panel) => naturalHeight(panel, width)));

    if (max !== lastMax) {
      lastMax = max;
      if (equalHeight || equalPanelHeight) {
        panels.forEach((panel) => {
          panel.style.minHeight = `${max}px`;
        });
      }
      if (equalHeight) root.style.minHeight = `${root.scrollHeight}px`;
    }

    measuring = false;
    // Re-observe on the next frame so the writes above are not delivered as a new entry.
    observeFrame = requestAnimationFrame(() => observer.observe(root));
  }

  const observer = new ResizeObserver(() => measure());
  measureFrame = requestAnimationFrame(measure);

  return () => {
    cancelAnimationFrame(measureFrame);
    cancelAnimationFrame(observeFrame);
    observer.disconnect();
    root.style.minHeight = "";
    panels.forEach((panel) => {
      panel.style.minHeight = "";
    });
  };
}

function panelWidth(root: HTMLElement, panels: HTMLElement[]): number {
  const visible = panels.find((panel) => !panel.hidden);
  const width = visible?.getBoundingClientRect().width || root.clientWidth;
  return width || root.getBoundingClientRect().width;
}

function naturalHeight(panel: HTMLElement, width: number): number {
  const previous = {
    hidden: panel.hidden,
    minHeight: panel.style.minHeight,
    position: panel.style.position,
    visibility: panel.style.visibility,
    width: panel.style.width,
    left: panel.style.left,
    top: panel.style.top,
  };

  panel.hidden = false;
  panel.style.minHeight = "0";
  panel.style.position = "absolute";
  panel.style.visibility = "hidden";
  panel.style.left = "0";
  panel.style.top = "0";
  if (width) panel.style.width = `${width}px`;
  const height = panel.scrollHeight;

  panel.hidden = previous.hidden;
  panel.style.minHeight = previous.minHeight;
  panel.style.position = previous.position;
  panel.style.visibility = previous.visibility;
  panel.style.width = previous.width;
  panel.style.left = previous.left;
  panel.style.top = previous.top;
  return height;
}

// ── Overflow scroll ──────────────────────────────────────────────────────────

function setupOverflow(list: HTMLElement, orientation: string): () => void {
  const isVertical = orientation === "vertical";
  const parent = list.parentNode;
  if (!parent) return () => {};

  const scroller = document.createElement("div");
  scroller.setAttribute("data-ut-scroller", "");
  parent.insertBefore(scroller, list);
  scroller.appendChild(list);

  const btnStart = document.createElement("button");
  const btnEnd = document.createElement("button");
  for (const [button, edge] of [
    [btnStart, "start"],
    [btnEnd, "end"],
  ] as const) {
    button.setAttribute("data-ut-scroll-btn", edge);
    button.setAttribute("type", "button");
    button.setAttribute("aria-hidden", "true");
    button.tabIndex = -1;
  }
  scroller.insertBefore(btnStart, list);
  scroller.appendChild(btnEnd);

  const scrollAmount = 120;

  function isRtl(): boolean {
    return !isVertical && getComputedStyle(list).direction === "rtl";
  }

  function maxScroll(): number {
    return isVertical ? list.scrollHeight - list.clientHeight : list.scrollWidth - list.clientWidth;
  }

  function logicalPosition(): number {
    if (isVertical) return list.scrollTop;
    if (!isRtl()) return list.scrollLeft;
    return logicalScrollFromStart(list.scrollLeft, Math.max(0, maxScroll()), detectRtlScrollType());
  }

  function scrollToward(towardEnd: number) {
    if (isVertical) {
      list.scrollTop += towardEnd;
    } else if (!isRtl()) {
      list.scrollLeft += towardEnd;
    } else {
      list.scrollLeft = scrollLeftAfterDelta(list.scrollLeft, towardEnd, detectRtlScrollType());
    }
    updateButtons();
  }

  function updateButtons() {
    const max = Math.max(0, maxScroll());
    const position = logicalPosition();
    btnStart.toggleAttribute("data-ut-scroll-hidden", position <= 1);
    btnEnd.toggleAttribute("data-ut-scroll-hidden", max <= 1 || position >= max - 1);
  }

  function scrollTabIntoView(tab: HTMLElement) {
    const listRect = list.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();

    if (isVertical) {
      if (tabRect.top < listRect.top) list.scrollTop -= listRect.top - tabRect.top;
      else if (tabRect.bottom > listRect.bottom) list.scrollTop += tabRect.bottom - listRect.bottom;
      updateButtons();
      return;
    }

    const rtl = isRtl();
    let towardEnd = 0;
    if (tabRect.left < listRect.left - 0.5) {
      const overflowPx = listRect.left - tabRect.left;
      towardEnd = rtl ? overflowPx : -overflowPx;
    } else if (tabRect.right > listRect.right + 0.5) {
      const overflowPx = tabRect.right - listRect.right;
      towardEnd = rtl ? -overflowPx : overflowPx;
    }
    if (towardEnd !== 0) scrollToward(towardEnd);
  }

  function onScrollStart() {
    scrollToward(-scrollAmount);
  }

  function onScrollEnd() {
    scrollToward(scrollAmount);
  }

  function onFocusIn(event: FocusEvent) {
    const tab = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-ut-tab]");
    if (!tab || !list.contains(tab)) return;
    scrollTabIntoView(tab);
  }

  btnStart.addEventListener("click", onScrollStart);
  btnEnd.addEventListener("click", onScrollEnd);
  list.addEventListener("scroll", updateButtons, { passive: true });
  list.addEventListener("focusin", onFocusIn);

  const observer = new ResizeObserver(updateButtons);
  observer.observe(list);
  updateButtons();

  return () => {
    observer.disconnect();
    list.removeEventListener("scroll", updateButtons);
    list.removeEventListener("focusin", onFocusIn);
    btnStart.removeEventListener("click", onScrollStart);
    btnEnd.removeEventListener("click", onScrollEnd);
    if (scroller.parentNode) {
      scroller.parentNode.insertBefore(list, scroller);
      scroller.remove();
    }
  };
}

// ── Panel transitions ────────────────────────────────────────────────────────

function applyTransitionPanels(
  outgoing: HTMLElement,
  incoming: HTMLElement,
  transition: string,
): () => void {
  const top = incoming.offsetTop;
  const left = incoming.offsetLeft;
  const width = incoming.offsetWidth;

  outgoing.hidden = false;
  outgoing.setAttribute("data-ut-panel-leaving", transition);
  incoming.setAttribute("data-ut-panel-entering", transition);
  outgoing.style.top = `${top}px`;
  outgoing.style.left = `${left}px`;
  outgoing.style.width = `${width}px`;

  const duration = parseDuration(
    getComputedStyle(incoming).getPropertyValue("--ut-transition-duration"),
  );

  let done = false;
  let timer = 0;

  const finish = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    incoming.removeEventListener("animationend", finish);
    outgoing.hidden = true;
    outgoing.removeAttribute("data-ut-panel-leaving");
    incoming.removeAttribute("data-ut-panel-entering");
    outgoing.style.top = "";
    outgoing.style.left = "";
    outgoing.style.width = "";
  };

  timer = window.setTimeout(finish, duration + 50);
  incoming.addEventListener("animationend", finish);
  return finish;
}
