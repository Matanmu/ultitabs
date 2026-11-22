// DOM APIs the library uses that jsdom does not implement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

let frameId = 0;
globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
  frameId += 1;
  callback(0);
  return frameId;
}) as typeof requestAnimationFrame;

globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;

const nativeGetComputedStyle = window.getComputedStyle.bind(window);

function directionOf(element: Element): string {
  const html = element as HTMLElement;
  if (html.style?.direction === "rtl" || element.getAttribute("dir") === "rtl") return "rtl";
  if (html.style?.direction === "ltr" || element.getAttribute("dir") === "ltr") return "ltr";

  try {
    const computed = nativeGetComputedStyle(element).direction;
    if (computed === "rtl" || computed === "ltr") return computed;
  } catch {
    // jsdom can throw on disconnected elements; fall through to ancestors.
  }

  let parent = element.parentElement;
  while (parent) {
    if (parent.style.direction === "rtl" || parent.getAttribute("dir") === "rtl") return "rtl";
    if (parent.style.direction === "ltr" || parent.getAttribute("dir") === "ltr") return "ltr";
    parent = parent.parentElement;
  }
  return "ltr";
}

window.getComputedStyle = ((element: Element) => {
  const direction = directionOf(element);
  return {
    direction,
    getPropertyValue: (name: string) => {
      if (name === "--ut-transition-duration") {
        return (element as HTMLElement).style?.getPropertyValue(name) || "200ms";
      }
      return "";
    },
  };
}) as typeof window.getComputedStyle;
