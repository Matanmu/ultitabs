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

export function cleanupAria(section: TabSection): void {
  const { list, tabs, tabPanelMap } = section;

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

  tabPanelMap.forEach((panel) => {
    panel.removeAttribute("role");
    panel.removeAttribute("aria-labelledby");
    panel.removeAttribute("tabindex");
    panel.hidden = false;
  });
}

export function updateAriaSelection(
  tabs: HTMLElement[],
  tabPanelMap: Map<number, HTMLElement>,
  activeIndex: number
): void {
  tabs.forEach((tab, i) => {
    const isActive = i === activeIndex;
    const isDisabled = tab.hasAttribute("data-ut-disabled");
    tab.setAttribute("aria-selected", String(isActive));
    // Disabled tabs always have tabindex=-1
    tab.setAttribute("tabindex", isActive && !isDisabled ? "0" : "-1");
    if (isActive) tab.setAttribute("data-ut-active", "");
    else tab.removeAttribute("data-ut-active");
  });

  // Update panel visibility using the tab-to-panel mapping
  tabPanelMap.forEach((panel, tabIndex) => {
    const isActive = tabIndex === activeIndex;
    panel.hidden = !isActive;
    panel.setAttribute("tabindex", "0");
  });
}

export function setupKeyboard(
  list: HTMLElement,
  tabs: HTMLElement[],
  orientation: Orientation,
  onSelect: (index: number) => void
): () => void {
  const isHorizontal = orientation === "horizontal";

  // Find next enabled tab in a direction, wrapping around
  function findNextEnabled(start: number, direction: 1 | -1): number | null {
    const len = tabs.length;
    for (let i = 1; i <= len; i++)
    {
      const idx = (start + direction * i + len) % len;
      if (!tabs[idx].hasAttribute("data-ut-disabled"))
      {
        return idx;
      }
    }
    return null;
  }

  function findFirstEnabled(): number | null {
    for (let i = 0; i < tabs.length; i++)
    {
      if (!tabs[i].hasAttribute("data-ut-disabled")) return i;
    }
    return null;
  }

  function findLastEnabled(): number | null {
    for (let i = tabs.length - 1; i >= 0; i--)
    {
      if (!tabs[i].hasAttribute("data-ut-disabled")) return i;
    }
    return null;
  }

  function handleKeydown(e: KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    // Detect RTL at event time so it reflects current DOM state
    const isRtl = isHorizontal && getComputedStyle(list).direction === "rtl";

    let nextIndex: number | null = null;

    switch (e.key)
    {
      case isHorizontal ? (isRtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown":
        nextIndex = findNextEnabled(currentIndex, 1);
        break;
      case isHorizontal ? (isRtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp":
        nextIndex = findNextEnabled(currentIndex, -1);
        break;
      case "Home":
        nextIndex = findFirstEnabled();
        break;
      case "End":
        nextIndex = findLastEnabled();
        break;
      default:
        return;
    }

    if (nextIndex === null) return;

    e.preventDefault();
    tabs[nextIndex].focus();
    onSelect(nextIndex);
  }

  list.addEventListener("keydown", handleKeydown);
  return () => list.removeEventListener("keydown", handleKeydown);
}