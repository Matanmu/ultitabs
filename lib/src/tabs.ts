import type { TabPath, TabsConfig, TabsInstance, TabSection } from "./types";
import { resolveElement } from "./utils";
import { setupAria, updateAriaSelection, setupKeyboard } from "./aria";
import { updateIndicator, updateIndicatorNextFrame, observeResize } from "./indicator";

type ChangeHandler = (path: TabPath, prevPath: TabPath | null) => void;

export function createTabs(config: TabsConfig): TabsInstance {
  const {
    defaultPath,
    orientation = "horizontal",
    variant = "underline",
    justify = "start",
    side = "left",
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

  // Setup ARIA
  setupAria(section);

  // State
  let currentPath: TabPath | null = null;
  const listeners: Set<ChangeHandler> = new Set();
  if (onChange) listeners.add(onChange);

  // Determine initial path
  const initialPath = defaultPath ?? getTabPath(tabs[0]);

  // Click handlers
  function handleClick(e: MouseEvent) {
    const tab = (e.target as HTMLElement).closest<HTMLElement>("[data-ut-tab]");
    if (!tab || !tabs.includes(tab)) return;
    setPath(getTabPath(tab));
  }
  list.addEventListener("click", handleClick);

  // Keyboard
  const cleanupKeyboard = setupKeyboard(list, tabs, orientation, (index) => {
    setPath(getTabPath(tabs[index]));
  });

  // ResizeObserver for indicator
  const cleanupResize = observeResize(list, tabs, () =>
    tabs.findIndex((t) => getTabPath(t) === currentPath)
  );

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

    listeners.forEach((fn) => fn(path, prevPath));
  }

  function destroy(): void {
    list.removeEventListener("click", handleClick);
    cleanupKeyboard();
    cleanupResize();
    cancelInitialRaf?.();
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