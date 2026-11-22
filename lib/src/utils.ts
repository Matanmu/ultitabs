let counter = 0;

export function generateId(prefix = "ut"): string {
  counter += 1;
  return `${prefix}-${counter}`;
}

export function resolveElement(el: HTMLElement | string): HTMLElement {
  if (typeof el === "string") {
    const found = document.querySelector<HTMLElement>(el);
    if (!found) throw new Error(`[ultitabs] Element not found: ${el}`);
    return found;
  }
  return el;
}

/**
 * How a browser reports `scrollLeft` when `direction` is `rtl`.
 *
 * - `negative`: 0 at the inline start (right), negative toward the end. Firefox,
 *   Safari, and current Chromium.
 * - `normal`: 0 at the physical left (the inline end), max at the inline start.
 *   Older WebKit/Chromium.
 * - `inverted`: 0 at the inline start, increasing toward the end. Legacy Edge/IE.
 */
export type RtlScrollType = "negative" | "normal" | "inverted";

/** Distance from the inline-start edge. 0 means the scroller is at the start. */
export function logicalScrollFromStart(
  scrollLeft: number,
  maxScroll: number,
  type: RtlScrollType,
): number {
  switch (type) {
    case "negative":
      return -scrollLeft || 0;
    case "normal":
      return maxScroll - scrollLeft;
    case "inverted":
      return scrollLeft;
  }
}

/** Move `towardEnd` pixels toward the inline end (negative values move toward the start). */
export function scrollLeftAfterDelta(
  scrollLeft: number,
  towardEnd: number,
  type: RtlScrollType,
): number {
  return type === "inverted" ? scrollLeft + towardEnd : scrollLeft - towardEnd;
}

let cachedRtlScrollType: RtlScrollType | null = null;

/** Feature-detect this browser's RTL `scrollLeft` model. Cached after the first call. */
export function detectRtlScrollType(): RtlScrollType {
  if (cachedRtlScrollType) return cachedRtlScrollType;
  if (typeof document === "undefined" || !document.body) return "negative";

  const scroller = document.createElement("div");
  const content = document.createElement("div");
  scroller.dir = "rtl";
  scroller.style.cssText =
    "width:1px;height:1px;overflow:auto;position:absolute;top:-9999px;visibility:hidden";
  content.style.cssText = "width:2px;height:1px";
  scroller.appendChild(content);
  document.body.appendChild(scroller);

  if (scroller.scrollLeft === 0) {
    scroller.scrollLeft = 1;
    cachedRtlScrollType = scroller.scrollLeft === 0 ? "negative" : "inverted";
  } else {
    cachedRtlScrollType = "normal";
  }

  scroller.remove();
  return cachedRtlScrollType;
}

export function parseDuration(raw: string): number {
  const value = raw.trim() || "200ms";
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return 200;
  if (value.endsWith("ms")) return amount;
  if (value.endsWith("s")) return amount * 1000;
  return amount;
}
