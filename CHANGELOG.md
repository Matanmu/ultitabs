# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 — 2026-03-04

### Initial Release

#### `ultitabs`

- Zero-dependency core, 1.5 kb minified + gzipped
- GPU-composited CSS indicator animation (60 fps, no layout thrash)
- Three variants: `underline`, `pill`, `bordered`
- Justify options: `start`, `center`, `end`, `between`, `around`, `evenly`
- Vertical orientation with `side="left"` / `side="right"`
- Infinite nesting — independent keyboard scope per level
- Full WAI-ARIA: `role="tablist/tab/tabpanel"`, `aria-selected`, `aria-controls`, `aria-labelledby`, roving tabindex
- Full RTL support — automatic via CSS logical properties + runtime direction detection
- 15+ CSS custom properties for zero-JS theming
- Programmatic control via `setPath()` and `onChange` callback
- ESM + CJS dual build, full TypeScript types

