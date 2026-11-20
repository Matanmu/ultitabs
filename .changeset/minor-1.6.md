---
"ultitabs": minor
---

## Added

- Panels with matching `data-ut-tab` and `data-ut-panel` values pair even when their DOM order differs. Markup whose values are missing or do not match still pairs by index, as in 1.5.
- `hashchange` updates a `syncUrl` widget. Init, back/forward, and hash edits use `history.replaceState`. A click or `setPath` still pushes one history entry. The hash string is unchanged (`#ut-{id}-{path}`).
- Arrow keys, Home, and End skip `data-ut-disabled` tabs. Disabled tabs get `aria-disabled` and a dimmed style. `setPath`, the URL, and persisted state can still select a disabled id.
- Leaving panels stay absolutely positioned, slide direction follows RTL, and `prefers-reduced-motion: reduce` shortens the motion.
- Vertical pill tabs keep the pill highlight.
- Overflow arrows follow the inline direction, detect the browser's RTL `scrollLeft` model, and scroll the focused tab into view.
- `equalHeight` measures panels out of flow and does not loop the resize observer.
- A second `createTabs()` on the same root replaces the previous instance instead of stacking listeners.
- New CSS variables for borders, pill surfaces, and the focus ring. Existing variable names are unchanged. The default theme stays light. `data-ut-theme="dark"` opts into the dark palette. The focus ring is inset.
- `ultitabs/css/ultitabs.min.css` is the minified stylesheet. `ultitabs/css` still points at the unminified file. JS builds are minified. `Transition` is exported from the package entry.

## Deprecated

- `onChange` still runs before the switch and can return `false`. The first time you pass it, development builds log a one-time warning. Use `beforeChange`.
