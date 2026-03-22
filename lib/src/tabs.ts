import type { TabPath, TabsConfig, TabsInstance, TabSection, TabChangeHandler, TabBeforeChangeHandler } from "./types";
import { resolveElement } from "./utils";
import { setupAria, updateAriaSelection, setupKeyboard } from "./aria";
import { updateIndicator, updateIndicatorNextFrame, observeResize } from "./indicator";

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
    onChange,
    beforeChange,
    afterChange,
  } = config;

  const root = resolveElement(config.el);
  const section = discoverDOM(root);
  const { list, tabs, panels } = section;

  // Set variant, orientation, justify, side, transition
  root.setAttribute("data-ut-variant", variant);
  root.setAttribute("data-ut-orientation", orientation);
  root.setAttribute("data-ut-side", side);
  list.setAttribute("aria-orientation", orientation);
  list.setAttribute("data-ut-justify", justify);
  if (transition) root.setAttribute("data-ut-transition", transition);

  // Overflow scroll — wrap list in a scroller, add arrow buttons
  let cleanupOverflow: (() => void) | null = null;
  if (overflow) cleanupOverflow = setupOverflow(list, orientation);

  // Equal height — measure after first paint
  let cleanupEqualHeight: (() => void) | null = null;
  if (equalHeight || equalPanelHeight) {
    cleanupEqualHeight = setupEqualHeight(root, panels, equalHeight, equalPanelHeight);
  }

  // Setup ARIA — also marks disabled tabs
  setupAria(section);
  markDisabledTabs(tabs);

  // State
  let currentPath: TabPath | null = null;
  const listeners: Set<TabChangeHandler> = new Set();
  const beforeListeners: Set<TabBeforeChangeHandler> = new Set();
  const afterListeners: Set<TabChangeHandler> = new Set();

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

    // Skip hooks on the initial deferred render (no previous state to transition from)
    if (!defer) {
      // beforeChange (and legacy onChange) can return false to cancel the switch
      if (beforeChange && beforeChange(path, prevPath) === false) return;
      if (onChange && onChange(path, prevPath) === false) return;
      for (const fn of beforeListeners) { if (fn(path, prevPath) === false) return; }
    }

    currentPath = path;

    const prevIndex = panels.findIndex((p) => !p.hidden);

    updateAriaSelection(tabs, panels, index);

    // Transition: animate after updateAriaSelection has activated the new panel
    if (transition && prevIndex !== -1 && prevIndex !== index) {
      applyTransition(panels, index, prevIndex, transition);
    }

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

    if (!defer) {
      // Notify change listeners (fired after state is committed)
      listeners.forEach((fn) => fn(path, prevPath));

      // afterChange config callback + afterChange listeners
      afterChange?.(path, prevPath);
      afterListeners.forEach((fn) => fn(path, prevPath));
    }
  }

  function destroy(): void {
    list.removeEventListener("click", handleClick);
    cleanupKeyboard();
    cleanupResize();
    cleanupOverflow?.();
    cleanupEqualHeight?.();
    cancelInitialRaf?.();
    if (syncUrl) window.removeEventListener("popstate", handlePopState);
    listeners.clear();
    beforeListeners.clear();
    afterListeners.clear();
  }

  function on(event: "beforeChange", handler: TabBeforeChangeHandler): () => void;
  function on(event: "change" | "afterChange", handler: TabChangeHandler): () => void;
  function on(event: string, handler: TabBeforeChangeHandler | TabChangeHandler): () => void {
    if (event === "beforeChange") { beforeListeners.add(handler as TabBeforeChangeHandler); return () => beforeListeners.delete(handler as TabBeforeChangeHandler); }
    if (event === "afterChange")  { afterListeners.add(handler as TabChangeHandler);  return () => afterListeners.delete(handler as TabChangeHandler); }
    listeners.add(handler as TabChangeHandler);
    return () => listeners.delete(handler as TabChangeHandler);
  }

  function off(event: "beforeChange", handler: TabBeforeChangeHandler): void;
  function off(event: "change" | "afterChange", handler: TabChangeHandler): void;
  function off(event: string, handler: TabBeforeChangeHandler | TabChangeHandler): void {
    if (event === "beforeChange") { beforeListeners.delete(handler as TabBeforeChangeHandler); return; }
    if (event === "afterChange")  { afterListeners.delete(handler as TabChangeHandler);  return; }
    listeners.delete(handler as TabChangeHandler);
  }

  // Initialize — defer to next frame so the DOM is laid out before measuring
  setPath(initialPath, true);

  return { getPath, setPath, destroy, on, off };
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

// ── Equal height ─────────────────────────────────────────────────────────────

function setupEqualHeight(
  root: HTMLElement,
  panels: HTMLElement[],
  equalHeight: boolean,
  equalPanelHeight: boolean
): () => void {
  function measure() {
    // Temporarily show all panels to measure their natural height
    const wasHidden = panels.map((p) => p.hidden);
    panels.forEach((p) => {
      p.hidden = false;
      p.style.minHeight = "";
    });
    root.style.minHeight = "";

    // Force reflow so scrollHeight reflects actual content
    void root.offsetHeight;

    const max = Math.max(...panels.map((p) => p.scrollHeight));

    // Restore hidden state
    panels.forEach((p, i) => {
      p.hidden = wasHidden[i];
    });

    // equalHeight: set min-height on root to prevent the page from jumping
    // Also set it on panels — without this the root min-height alone doesn't
    // prevent the content area from shrinking when a shorter panel is shown
    if (equalHeight) {
      panels.forEach((p) => (p.style.minHeight = `${max}px`));
      void root.offsetHeight; // reflow after panels are sized
      root.style.minHeight = `${root.scrollHeight}px`;
    }
    if (equalPanelHeight) panels.forEach((p) => (p.style.minHeight = `${max}px`));
  }

  // Measure after first paint so content is rendered
  const raf = requestAnimationFrame(measure);

  // Re-measure when content size changes
  const ro = new ResizeObserver(measure);
  ro.observe(root);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    root.style.minHeight = "";
    panels.forEach((p) => (p.style.minHeight = ""));
  };
}

// ── Overflow scroll ──────────────────────────────────────────────────────────

function setupOverflow(list: HTMLElement, orientation: string): () => void {
  const isVertical = orientation === "vertical";
  const scroller = document.createElement("div");
  scroller.setAttribute("data-ut-scroller", "");
  list.parentNode!.insertBefore(scroller, list);
  scroller.appendChild(list);

  const btnStart = document.createElement("button");
  const btnEnd = document.createElement("button");
  btnStart.setAttribute("data-ut-scroll-btn", "start");
  btnEnd.setAttribute("data-ut-scroll-btn", "end");
  btnStart.setAttribute("aria-hidden", "true");
  btnEnd.setAttribute("aria-hidden", "true");
  btnStart.setAttribute("tabindex", "-1");
  btnEnd.setAttribute("tabindex", "-1");
  btnStart.textContent = isVertical ? "▲" : "◀";
  btnEnd.textContent = isVertical ? "▼" : "▶";
  scroller.insertBefore(btnStart, list);
  scroller.appendChild(btnEnd);

  const scrollAmount = 120;

  function onScrollStart() {
    if (isVertical) list.scrollTop -= scrollAmount;
    else list.scrollLeft -= scrollAmount;
    updateButtons();
  }
  function onScrollEnd() {
    if (isVertical) list.scrollTop += scrollAmount;
    else list.scrollLeft += scrollAmount;
    updateButtons();
  }

  function updateButtons() {
    const atStart = isVertical ? list.scrollTop <= 0 : list.scrollLeft <= 0;
    const atEnd = isVertical
      ? list.scrollTop + list.clientHeight >= list.scrollHeight - 1
      : list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
    btnStart.toggleAttribute("data-ut-scroll-hidden", atStart);
    btnEnd.toggleAttribute("data-ut-scroll-hidden", atEnd);
  }

  btnStart.addEventListener("click", onScrollStart);
  btnEnd.addEventListener("click", onScrollEnd);
  list.addEventListener("scroll", updateButtons, { passive: true });

  const ro = new ResizeObserver(updateButtons);
  ro.observe(list);
  updateButtons();

  return () => {
    ro.disconnect();
    list.removeEventListener("scroll", updateButtons);
    btnStart.removeEventListener("click", onScrollStart);
    btnEnd.removeEventListener("click", onScrollEnd);
    if (scroller.parentNode) {
      scroller.parentNode.insertBefore(list, scroller);
      scroller.remove();
    }
  };
}

// ── Panel transitions ────────────────────────────────────────────────────────

function applyTransition(
  panels: HTMLElement[],
  nextIndex: number,
  prevIndex: number,
  transition: string
): void {
  const outgoing = panels[prevIndex];
  const incoming = panels[nextIndex];

  // Show outgoing again temporarily so it can animate out
  outgoing.hidden = false;
  outgoing.setAttribute("data-ut-panel-leaving", "");
  incoming.setAttribute("data-ut-panel-entering", transition);

  // Determine animation duration from CSS variable or fallback
  const style = getComputedStyle(incoming);
  const durationStr = style.getPropertyValue("--ut-transition-duration").trim() || "200ms";
  const duration = parseFloat(durationStr) * (durationStr.endsWith("s") && !durationStr.endsWith("ms") ? 1000 : 1);

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    outgoing.hidden = true;
    outgoing.removeAttribute("data-ut-panel-leaving");
    incoming.removeAttribute("data-ut-panel-entering");
  };

  incoming.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, duration + 50);
}