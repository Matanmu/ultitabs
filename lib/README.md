# UltiTabs

[![npm version](https://img.shields.io/npm/v/ultitabs.svg)](https://www.npmjs.com/package/ultitabs)
[![CI](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml/badge.svg)](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/ultitabs)](https://bundlephobia.com/package/ultitabs)
[![license](https://img.shields.io/npm/l/ultitabs)](./LICENSE)

Zero-dependency tab library — 1.5kb, full WAI-ARIA, GPU-animated indicator, infinite nesting, RTL, and AI-agent ready.

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
  onChange: (path, prev) => console.log(path),
})

tabs.setPath('features') // switch tab programmatically
tabs.getPath()           // get current tab
tabs.destroy()           // clean up
```

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

---

## Features

- **1.5kb** — zero dependencies, ESM + CJS, full TypeScript types
- **GPU-composited indicator** — CSS `transform`-based animation, 60fps always
- **Full WAI-ARIA** — `role="tablist/tab/tabpanel"`, `aria-selected`, roving tabindex
- **Infinite nesting** — 3+ levels deep, independent keyboard scope per level
- **Three variants** — underline, pill, bordered — one prop to switch
- **Full RTL support** — automatic, zero-config
- **Vertical orientation** — sidebar tabs with left/right placement
- **Programmatic control** — `setPath()` + `onChange` callback
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
| Bundle size | **1.5kb** | 5–30kb |
| Dependencies | **0** | 2–15 |
| CSS-driven animation | **Yes** | Rarely |
| Infinite nesting | **Yes** | No |
| ARIA compliant | **100%** | Partial |
| AI agent ready | **Yes — built for it** | No |
| RTL support | **Full, automatic** | Rare / manual |

---

## License

MIT © Matan Mualem
