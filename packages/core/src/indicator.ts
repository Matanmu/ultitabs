export function updateIndicator(list: HTMLElement, activeTab: HTMLElement): void {
  const listRect = list.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  const isRtl = getComputedStyle(list).direction === "rtl";

  // In RTL, measure from the right edge of the list so the indicator tracks correctly
  const left = isRtl
    ? listRect.right - tabRect.right + list.scrollLeft
    : tabRect.left - listRect.left + list.scrollLeft;

  const top = tabRect.top - listRect.top + list.scrollTop;

  list.style.setProperty("--ut-indicator-left", `${left}px`);
  list.style.setProperty("--ut-indicator-top", `${top}px`);
  list.style.setProperty("--ut-indicator-width", `${tabRect.width}px`);
  list.style.setProperty("--ut-indicator-height-val", `${tabRect.height}px`);
}

export function updateIndicatorNextFrame(
  list: HTMLElement,
  activeTab: HTMLElement
): () => void {
  const raf = requestAnimationFrame(() => updateIndicator(list, activeTab));
  return () => cancelAnimationFrame(raf);
}

export function observeResize(
  list: HTMLElement,
  tabs: HTMLElement[],
  getActiveIndex: () => number
): () => void {
  const ro = new ResizeObserver(() => {
    const idx = getActiveIndex();
    if (tabs[idx]) {
      updateIndicator(list, tabs[idx]);
    }
  });

  ro.observe(list);
  tabs.forEach((tab) => ro.observe(tab));

  return () => ro.disconnect();
}