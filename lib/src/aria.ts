import type { Orientation, TabSection } from "./types";
import { generateId } from "./utils";

export function setupAria(section: TabSection): void {
  const { list, tabs, tabPanelMap } = section;

  list.setAttribute("role", "tablist");

  tabs.forEach((tab, i) => {
    const panel = tabPanelMap.get(i);
    if (!panel) return;

    const tabId = tab.id || generateId("ut-tab");
    const panelId = panel.id || generateId("ut-panel");

    tab.id = tabId;
    panel.id = panelId;

    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-controls", panelId);

    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", tabId);
  });
}

function clearPanel(panel: HTMLElement): void {
  panel.removeAttribute("role");
  panel.removeAttribute("aria-labelledby");
  panel.removeAttribute("tabindex");
  panel.removeAttribute("data-ut-panel-leaving");
  panel.removeAttribute("data-ut-panel-entering");
  panel.style.top = "";
  panel.style.left = "";
  panel.style.width = "";
  panel.hidden = false;
}

export function cleanupAria(section: TabSection): void {
  const { list, tabs, panels, tabPanelMap } = section;

  list.removeAttribute("role");
  list.removeAttribute("aria-orientation");

  tabs.forEach((tab) => {
    tab.removeAttribute("role");
    tab.removeAttribute("aria-controls");
    tab.removeAttribute("aria-selected");
    tab.removeAttribute("aria-disabled");
    tab.removeAttribute("tabindex");
    tab.removeAttribute("data-ut-active");
  });

  const seen = new Set<HTMLElement>();
  panels.forEach((panel) => {
    seen.add(panel);
    clearPanel(panel);
  });
  tabPanelMap.forEach((panel) => {
    if (seen.has(panel)) return;
    clearPanel(panel);
  });
}

export function updateAriaSelection(
  tabs: HTMLElement[],
  tabPanelMap: Map<number, HTMLElement>,
  panels: HTMLElement[],
  activeIndex: number,
): void {
  tabs.forEach((tab, i) => {
    const isActive = i === activeIndex;
    const isDisabled = tab.hasAttribute("data-ut-disabled");
    tab.setAttribute("aria-selected", String(isActive));
    if (isDisabled) tab.setAttribute("aria-disabled", "true");
    else tab.removeAttribute("aria-disabled");
    // Disabled tabs stay out of the tab sequence, including if one was active.
    tab.setAttribute("tabindex", isActive && !isDisabled ? "0" : "-1");
    if (isActive) tab.setAttribute("data-ut-active", "");
    else tab.removeAttribute("data-ut-active");
  });

  const activePanel = tabPanelMap.get(activeIndex) ?? null;
  const allPanels = new Set<HTMLElement>([...panels, ...tabPanelMap.values()]);
  allPanels.forEach((panel) => {
    panel.hidden = panel !== activePanel;
    panel.setAttribute("tabindex", "0");
  });
}

export function setupKeyboard(
  list: HTMLElement,
  tabs: HTMLElement[],
  orientation: Orientation,
  onSelect: (index: number) => void,
): () => void {
  const isHorizontal = orientation === "horizontal";

  function isEnabled(index: number): boolean {
    return !tabs[index].hasAttribute("data-ut-disabled");
  }

  function findEnabled(start: number, direction: 1 | -1): number | null {
    const len = tabs.length;
    for (let step = 1; step <= len; step += 1) {
      const index = (start + direction * step + len) % len;
      if (isEnabled(index)) return index;
    }
    return null;
  }

  function findEdge(fromEnd: boolean): number | null {
    if (fromEnd) {
      for (let i = tabs.length - 1; i >= 0; i -= 1) {
        if (isEnabled(i)) return i;
      }
      return null;
    }
    for (let i = 0; i < tabs.length; i += 1) {
      if (isEnabled(i)) return i;
    }
    return null;
  }

  function handleKeydown(event: KeyboardEvent) {
    const currentIndex = tabs.findIndex((tab) => tab === document.activeElement);
    if (currentIndex === -1) return;

    const isRtl = isHorizontal && getComputedStyle(list).direction === "rtl";
    let nextIndex: number | null = null;

    switch (event.key) {
      case isHorizontal ? (isRtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown":
        nextIndex = findEnabled(currentIndex, 1);
        break;
      case isHorizontal ? (isRtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp":
        nextIndex = findEnabled(currentIndex, -1);
        break;
      case "Home":
        nextIndex = findEdge(false);
        break;
      case "End":
        nextIndex = findEdge(true);
        break;
      default:
        return;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    tabs[nextIndex].focus();
    onSelect(nextIndex);
  }

  list.addEventListener("keydown", handleKeydown);
  return () => list.removeEventListener("keydown", handleKeydown);
}
