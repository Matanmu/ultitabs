---
"ultitabs": major
---

## UltiTabs 2.0.0

### Breaking Changes

- **`onChange` removed**: The deprecated `onChange` config option has been removed. Use `beforeChange` instead (same signature, can return `false` to cancel).

- **Panel pairing by value**: Panels are now paired with tabs by matching `data-ut-tab` and `data-ut-panel` attribute values, not by DOM order. This allows panels to be in any order in the HTML. If values don't match, it falls back to index-based pairing for backwards compatibility with tabs/panels that have no explicit values.

- **sideEffects in package.json**: The package now correctly declares `sideEffects` for the auto-init behavior. If you're using a bundler with tree-shaking and importing just types, this may affect your bundle.

### New Features

- **Dark theme**: CSS now includes dark mode support via `[data-ut-theme="dark"]` or automatic `prefers-color-scheme: dark` detection.

- **Improved disabled tabs**:
  - Keyboard navigation (Arrow, Home, End) now properly skips disabled tabs
  - `setPath()` refuses disabled tab paths
  - Disabled tabs have proper styling (`opacity`, `cursor: not-allowed`)

- **Better URL sync**:
  - Uses `replaceState` on init and browser back/forward (not `pushState`)
  - Listens to `hashchange` in addition to `popstate`

- **Transitions respect reduced motion**: `prefers-reduced-motion: reduce` disables animations.

- **RTL improvements**:
  - Slide transition animates in correct direction for RTL
  - Overflow scroll detection works correctly in RTL layouts

- **Full cleanup on destroy()**: All ARIA attributes, CSS variables, and DOM modifications are properly cleaned up.

- **Double-init prevention**: Calling `createTabs()` on an already-initialized element destroys the existing instance first.

- **New type exports**: `Transition`, `TabChangeHandler`, `TabBeforeChangeHandler` are now exported.

### CSS Changes

- All hardcoded colors are now CSS custom properties (tokenized)
- New CSS variables: `--ut-border-color`, `--ut-panel-bg`, `--ut-pill-track-bg`, `--ut-pill-active-bg`, `--ut-pill-shadow`, `--ut-focus-ring-color`, `--ut-focus-ring-offset`, `--ut-tab-disabled-opacity`
- Focus ring no longer clips (uses positive `outline-offset`)
- Vertical + pill variant CSS specificity fixed

### Migration Guide

1. **Replace `onChange` with `beforeChange`**:
   ```js
   // Before (v1.x)
   createTabs({ el, onChange: (path, prev) => { ... } })

   // After (v2.0)
   createTabs({ el, beforeChange: (path, prev) => { ... } })
   ```

2. **Panel order**: If your panels rely on DOM order matching tab order, they should still work. But if you have explicit `data-ut-panel` values, make sure they match your `data-ut-tab` values.

3. **CSS customization**: If you were overriding hardcoded colors like `#e5e7eb`, update to use the new CSS variables instead.
