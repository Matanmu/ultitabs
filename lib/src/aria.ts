import type { Orientation, TabSection } from "./types";
import { generateId } from "./utils";

export function setupAria(section: TabSection): void {
  const { list, tabs, panels } = section;

  list.setAttribute("role", "tablist");

  tabs.forEach((tab, i) => {
    const panel = panels[i];
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

export function updateAriaSelection(tabs: HTMLElement[], panels: HTMLElement[], activeIndex: number): void {
  tabs.forEach((tab, i) => {
    const isActive = i === activeIndex;
    tab.setAttribute("aria-selected", String(isActive));
    tab.setAttribute("tabindex", isActive ? "0" : "-1");
    if (isActive) tab.setAttribute("data-ut-active", "");
    else tab.removeAttribute("data-ut-active");
  });

  panels.forEach((panel, i) => {
    const isActive = i === activeIndex;
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

  function handleKeydown(e: KeyboardEvent) {
    const currentIndex = tabs.findIndex((t) => t === document.activeElement);
    if (currentIndex === -1) return;

    // Detect RTL at event time so it reflects current DOM state
    const isRtl = isHorizontal && getComputedStyle(list).direction === "rtl";

    let nextIndex: number | null = null;

    switch (e.key) {
      case isHorizontal ? (isRtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case isHorizontal ? (isRtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    tabs[nextIndex].focus();
    onSelect(nextIndex);
  }

  list.addEventListener("keydown", handleKeydown);
  return () => list.removeEventListener("keydown", handleKeydown);
}