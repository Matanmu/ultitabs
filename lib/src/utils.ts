let counter = 0;

export function generateId(prefix = "ut"): string {
  return `${prefix}-${++counter}`;
}

export function resolveElement(el: HTMLElement | string): HTMLElement {
  if (typeof el === "string") {
    const found = document.querySelector<HTMLElement>(el);
    if (!found) throw new Error(`[ultitabs] Element not found: ${el}`);
    return found;
  }
  return el;
}