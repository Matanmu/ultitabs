# @ultitabs/core

## 1.5.0

### Minor Changes

- **Tab change hooks** — new `beforeChange` and `afterChange` config callbacks alongside the richer `.on()` event system:
  - `beforeChange(path, prevPath)` — called before state changes; return `false` to cancel the switch (like `onChange`, which is now deprecated in favour of `beforeChange`)
  - `afterChange(path, prevPath)` — called after state is committed and all listeners have been notified; safe to read the new DOM state here
  - `.on('beforeChange', handler)` — subscribe imperatively; handler can return `false` to cancel; returns an unsubscribe function
  - `.on('afterChange', handler)` — subscribe imperatively; fires after all change listeners
  - `.off(event, handler)` — explicitly unsubscribe a handler without needing the returned unsubscribe function
- `onChange` config option is deprecated (still works, fires alongside `beforeChange`); prefer `beforeChange`

## 1.4.0

### Minor Changes

- `equalHeight: true` — sets `min-height` on the root section to match the tallest panel; no layout shift when switching tabs
- `equalPanelHeight: true` — sets `min-height` on every individual panel to match the tallest; all panels share the same height box
- Both options use `ResizeObserver` to re-measure when content changes, and clean up on `destroy()`

## 1.3.0

### Minor Changes

- `overflow: true` — when tabs overflow their container, scroll arrows appear automatically; clicking them scrolls the tab list; arrows hide when at the start/end
- `transition: 'fade' | 'slide'` — optional panel transition animation when switching tabs
- `onChange` now supports returning `false` to cancel a tab switch — useful for unsaved-changes guards or confirmation dialogs

## 1.2.0

### Minor Changes

- `syncUrl: true` — syncs active tab to the URL hash; browser back/forward navigation works automatically
- `persist: 'session' | 'local'` — remembers the active tab across page reloads using sessionStorage or localStorage
- `data-ut-disabled` — disable individual tabs via HTML attribute; disabled tabs are skipped by keyboard navigation and cannot be clicked

## 1.1.0

### Minor Changes

- `data-ut-default` HTML attribute — set the initial active tab without any JS config
- Auto-init — add `data-ut-auto` to any `[data-ut-section]` to initialize tabs automatically with zero JS

## 1.0.0

### Major Changes

- d9a58ad: Initial release
- Initial public release of UltiTabs v1.0.0
