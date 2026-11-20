---
"ultitabs": major
---

## Breaking changes

- **`onChange` is gone.** Pass `beforeChange` instead. It receives `(path, prevPath)` and cancels the switch when it returns `false`. Use `afterChange` or `.on("change")` for work that must run after the switch commits.

  ```js
  // 1.x
  createTabs({ el, onChange: (path, prev) => { /* return false to cancel */ } })

  // 2.0
  createTabs({ el, beforeChange: (path, prev) => { /* return false to cancel */ } })
  ```

- **`getPath()` is `string | null`.** It is `null` when every tab is disabled or nothing could be selected.

- **Panels pair by value.** A tab's `data-ut-tab` is matched to the panel with the same `data-ut-panel`. DOM order is used only when those values are missing. A value that does not match any panel is not paired by index.

- **`sideEffects` is no longer `false`.** Importing `ultitabs` runs auto-init for `[data-ut-section][data-ut-auto]`. Bundlers keep that side effect.

## Fixes

- `syncUrl` calls `history.replaceState` while initializing and while handling `popstate` / `hashchange`. `pushState` is only for a user or programmatic change.
- Arrow keys, Home, and End skip disabled tabs. `setPath` refuses a disabled id. Disabled tabs use `aria-disabled`, `tabindex="-1"`, and a dimmed style.
- The leaving panel is `position: absolute` (the in-flow `position: relative` rule no longer overrides it), so fade and slide do not stack two panels in normal flow. Slide direction follows RTL. `prefers-reduced-motion: reduce` shortens the motion.
- Vertical pill tabs keep the pill highlight. The vertical line indicator no longer wins the cascade.
- Overflow arrows use logical chevrons, detect the RTL start edge from the browser's `scrollLeft` model, and scroll the focused tab into view inside the list.
- `equalHeight` measures panels out of flow and does not observe the root while it is writing `min-height`, so the resize observer does not loop.
- `destroy()` removes listeners, roles, ARIA, tabindex, `hidden`, indicator variables, the overflow scroller, and equal-height styles. A second `createTabs()` on the same root replaces the previous instance.

## CSS

Hard-coded border, pill, panel, and focus colors are custom properties (`--ut-border-color`, `--ut-panel-bg`, `--ut-pill-track-bg`, `--ut-pill-active-bg`, `--ut-pill-shadow`, `--ut-focus-ring-color`, `--ut-focus-ring-offset`). The default theme stays light. `data-ut-theme="dark"` or `prefers-color-scheme: dark` selects the dark palette; `data-ut-theme="light"` forces light. The focus ring is inset so a scrolling tab list does not clip it.

Published JS is minified. `ultitabs/css/ultitabs.min.css` is the minified stylesheet.
