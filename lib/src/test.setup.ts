// Global stubs for DOM APIs used by the library in Node/Vitest environment
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

global.requestAnimationFrame = ((cb: () => void) => { cb(); return 0; }) as any;
global.cancelAnimationFrame = (() => {}) as any;

// Stub getComputedStyle (used by applyTransition)
global.getComputedStyle = ((el: Element) => ({
  getPropertyValue: () => "200ms",
})) as any;