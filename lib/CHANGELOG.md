# @ultitabs/core

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
