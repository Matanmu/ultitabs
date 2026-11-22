# UltiTabs

[![npm version](https://img.shields.io/npm/v/ultitabs.svg)](https://www.npmjs.com/package/ultitabs)
[![CI](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml/badge.svg)](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/ultitabs)](https://bundlephobia.com/package/ultitabs)
[![license](https://img.shields.io/npm/l/ultitabs)](./LICENSE)

Zero-dependency tab library — accessible tabs, a CSS indicator, infinite nesting, and RTL. Minified + gzipped: 4.25 kB of JS and 2.04 kB of CSS.

**[Live Demo & Docs →](https://phpstack-370615-6257546.cloudwaysapps.com/)**

---

## Install

```bash
npm install ultitabs
```

## Quick Start

```html
<div data-ut-section>
  <div data-ut-list>
    <button data-ut-tab="overview">Overview</button>
    <button data-ut-tab="features">Features</button>
    <button data-ut-tab="pricing">Pricing</button>
  </div>
  <div data-ut-panel="overview">Overview content</div>
  <div data-ut-panel="features">Features content</div>
  <div data-ut-panel="pricing">Pricing content</div>
</div>

<link rel="stylesheet" href="node_modules/ultitabs/css/ultitabs.css" />
<script type="module">
  import { createTabs } from 'ultitabs'
  createTabs({ el: '[data-ut-section]' })
</script>
```

Or from CDN (no build step):

```html
<link rel="stylesheet" href="https://unpkg.com/ultitabs/css/ultitabs.css">
<script type="module">
  import { createTabs } from 'https://unpkg.com/ultitabs/dist/index.mjs'
  document.querySelectorAll('[data-ut-section]').forEach(el => createTabs({ el }))
</script>
```

## API

```js
const tabs = createTabs({
  el: '#my-tabs',           // CSS selector or HTMLElement (required)
  variant: 'underline',     // 'underline' | 'pill' | 'bordered'
  orientation: 'horizontal',// 'horizontal' | 'vertical'
  justify: 'start',         // 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'
  side: 'left',             // 'left' | 'right' (vertical only)
  overflow: false,          // show scroll arrows when tabs overflow
  transition: 'fade',       // 'fade' | 'slide' — panel switch animation
  equalHeight: false,       // container min-height = tallest panel
  equalPanelHeight: false,  // every panel min-height = tallest panel
  beforeChange: (path, prev) => {
    // return false to cancel the tab switch
  },
  afterChange: (path, prev) => {
    // fires after state is committed
  },
})

tabs.setPath('features') // switch tab programmatically
tabs.getPath()           // current tab path
tabs.on('beforeChange', fn) // subscribe (returns unsubscribe fn)
tabs.on('afterChange', fn)
tabs.off('afterChange', fn) // explicit unsubscribe
tabs.destroy()           // clean up
```

---

## URL Sync

Keep the active tab in sync with the URL hash — browser back/forward navigation works automatically:

```js
createTabs({ el: '#my-tabs', syncUrl: true })
```

Switching tabs updates the URL to `#ut-my-tabs-features`. Visiting the URL directly opens that tab.

---

## Persist Active Tab

Remember the active tab across page reloads:

```js
// sessionStorage — cleared when browser closes
createTabs({ el: '#my-tabs', persist: 'session' })

// localStorage — persists indefinitely
createTabs({ el: '#my-tabs', persist: 'local' })
```

---

## Disabled Tabs

Disable individual tabs via HTML attribute — they can't be clicked, keyboard navigation skips them, and `setPath()` refuses them:

```html
<div data-ut-section>
  <div data-ut-list>
    <button data-ut-tab="overview">Overview</button>
    <button data-ut-tab="features" data-ut-disabled>Features</button>
    <button data-ut-tab="pricing">Pricing</button>
  </div>
  ...
</div>
```

---

## Overflow Scroll

When you have many tabs, enable overflow mode to add scroll arrows automatically:

```js
createTabs({ el: '#my-tabs', overflow: true })
```

Arrow buttons appear at the edges when the tab list overflows its container. They disappear when you're at the start or end.

---

## Panel Transitions

Add a fade or slide animation when switching between panels:

```js
createTabs({ el: '#my-tabs', transition: 'fade' })  // fade in/out
createTabs({ el: '#my-tabs', transition: 'slide' })  // slide + fade
```

Control the duration with a CSS variable:

```css
[data-ut-section] {
  --ut-transition-duration: 300ms;
}
```

---

## Equal Height

Prevent layout shift when switching between panels of different heights.

```js
// Container gets min-height = tallest panel
createTabs({ el: '#my-tabs', equalHeight: true })

// Every panel gets min-height = tallest panel
createTabs({ el: '#my-tabs', equalPanelHeight: true })

// Both together
createTabs({ el: '#my-tabs', equalHeight: true, equalPanelHeight: true })
```

Both options re-measure automatically when content changes (via `ResizeObserver`).

---

## Lifecycle Hooks

Use `beforeChange` and `afterChange` for full control over tab transitions:

```js
const tabs = createTabs({
  el: '#my-tabs',

  // Fires BEFORE the switch — return false to cancel
  beforeChange: (path, prevPath) => {
    if (hasUnsavedChanges()) return false
  },

  // Fires AFTER state is committed — safe to read new DOM
  afterChange: (path, prevPath) => {
    analytics.track('tab_change', { from: prevPath, to: path })
  },
})

// Imperative subscriptions
const unsub = tabs.on('beforeChange', (path, prev) => {
  // return false here also cancels the switch
})
tabs.on('afterChange', (path) => {
  document.title = `My App — ${path}`
})

// Unsubscribe
unsub()                       // via returned function
tabs.off('afterChange', myFn) // or via .off()
```

`onChange` still runs before the switch and can return `false`, same as 1.5. It is deprecated: the first time you pass it, development builds log a one-time warning. Use `beforeChange`.

---

## Auto-Init

Add `data-ut-auto` to any section — no JS needed at all:

```html
<link rel="stylesheet" href="https://unpkg.com/ultitabs/css/ultitabs.css">
<script type="module" src="https://unpkg.com/ultitabs/dist/index.mjs"></script>

<div data-ut-section data-ut-auto data-ut-default="features">
  <div data-ut-list>
    <button data-ut-tab="overview">Overview</button>
    <button data-ut-tab="features">Features</button>
    <button data-ut-tab="pricing">Pricing</button>
  </div>
  <div data-ut-panel="overview">Overview content</div>
  <div data-ut-panel="features">Features content</div>
  <div data-ut-panel="pricing">Pricing content</div>
</div>
```

`data-ut-default` sets which tab is active on load. Without it, the first tab is active.

---

## Usage with React

No wrapper needed — works directly inside any React component:

```jsx
import { useEffect, useRef } from 'react'
import { createTabs } from 'ultitabs'
import 'ultitabs/css'

export default function Tabs() {
  const ref = useRef(null)

  useEffect(() => {
    const tabs = createTabs({ el: ref.current })
    return () => tabs.destroy()
  }, [])

  return (
    <div data-ut-section ref={ref}>
      <div data-ut-list>
        <button data-ut-tab="overview">Overview</button>
        <button data-ut-tab="features">Features</button>
      </div>
      <div data-ut-panel="overview">Overview content</div>
      <div data-ut-panel="features">Features content</div>
    </div>
  )
}
```

## Usage with Vue

```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { createTabs } from 'ultitabs'
import 'ultitabs/css'

const el = ref(null)
let tabs

onMounted(() => { tabs = createTabs({ el: el.value }) })
onUnmounted(() => tabs?.destroy())
</script>

<template>
  <div data-ut-section ref="el">
    <div data-ut-list>
      <button data-ut-tab="overview">Overview</button>
      <button data-ut-tab="features">Features</button>
    </div>
    <div data-ut-panel="overview">Overview content</div>
    <div data-ut-panel="features">Features content</div>
  </div>
</template>
```

---

## CSS Theming

Override any visual with a CSS custom property — no JS required:

```css
[data-ut-section] {
  --ut-indicator-color: #8b5cf6;
  --ut-indicator-height: 3px;
  --ut-indicator-duration: 300ms;
}
```

| Variable | Default | Description |
|---|---|---|
| `--ut-indicator-color` | `#3b82f6` | Indicator / pill color |
| `--ut-indicator-height` | `2px` | Underline thickness |
| `--ut-indicator-duration` | `250ms` | Transition speed |
| `--ut-tab-color` | `#6b7280` | Inactive tab text |
| `--ut-tab-active-color` | `#111827` | Active tab text |
| `--ut-tab-padding` | `0.625rem 1rem` | Tab button padding |
| `--ut-border-color` | `#e5e7eb` | Underline and bordered strokes |
| `--ut-panel-bg` | `#fff` | Bordered active tab and panel surface |
| `--ut-pill-track-bg` | `#f3f4f6` | Pill track |
| `--ut-pill-active-bg` | `#fff` | Active pill highlight |
| `--ut-focus-ring-color` | indicator color | Focus ring |
| `--ut-focus-ring-offset` | `2px` | Inset focus ring, so overflow does not clip it |

The default palette is light. Set `data-ut-theme="dark"` on a section or an ancestor for the dark palette. `data-ut-theme="light"` on a section forces light under a dark ancestor. Dark mode does not follow the operating system on its own.

---

## Features

- **4.25 kB JS + 2.04 kB CSS** — minified + gzipped, zero runtime dependencies, ESM + CJS, TypeScript types
- **CSS indicator** — underline, pill, and bordered highlights follow the active tab
- **WAI-ARIA tabs** — `role="tablist/tab/tabpanel"`, `aria-selected`, `aria-disabled`, roving tabindex, arrow keys
- **Infinite nesting** — 3+ levels deep, independent keyboard scope per level
- **Three variants** — underline, pill, bordered — one prop to switch
- **Full RTL support** — automatic, zero-config
- **Vertical orientation** — sidebar tabs with left/right placement
- **Programmatic control** — `setPath()`, `getPath()`, `beforeChange`, and `afterChange`
- **URL sync** — `syncUrl: true` keeps the active tab in the URL hash
- **Persist** — `persist: 'session' | 'local'` remembers active tab across reloads
- **Disabled tabs** — `data-ut-disabled` attribute to disable individual tabs
- **Overflow scroll** — `overflow: true` adds scroll arrows when tabs overflow
- **Panel transitions** — `transition: 'fade' | 'slide'` animates panel switches
- **Equal height** — `equalHeight` / `equalPanelHeight` eliminates layout shift between panels
- **Cancellable switches** — return `false` from `beforeChange` (or the deprecated `onChange`) to block a tab switch
- **15+ CSS custom properties** — theme every pixel without touching JS

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `→` / `↓` | Next tab |
| `←` / `↑` | Previous tab |
| `Home` | First tab |
| `End` | Last tab |
| `Tab` | Move focus to active panel |

---

## RTL Support

Add `dir="rtl"` to the section or any ancestor — everything flips automatically:

```html
<div data-ut-section dir="rtl">
  ...
</div>
```

---

## Why UltiTabs

| | UltiTabs | Others |
|---|---|---|
| Bundle size | **4.25 kB JS + 2.04 kB CSS** (min + gzip) | 5–30kb |
| Dependencies | **0** | 2–15 |
| CSS-driven animation | **Yes** | Rarely |
| Infinite nesting | **Yes** | No |
| ARIA tabs pattern | **Yes** | Partial |
| AI agent ready | **Yes — built for it** | No |
| RTL support | **Full, automatic** | Rare / manual |

---

## License

MIT © Matan Mualem
