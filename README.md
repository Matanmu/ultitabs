# UltiTabs

[![npm version](https://img.shields.io/npm/v/@ultitabs/core.svg)](https://www.npmjs.com/package/@ultitabs/core)
[![CI](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml/badge.svg)](https://github.com/Matanmu/ultitabs/actions/workflows/ci.yml)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@ultitabs/core)](https://bundlephobia.com/package/@ultitabs/core)
[![license](https://img.shields.io/npm/l/@ultitabs/core)](./LICENSE)

**The best tab library ever built for the web.**

Zero-dependency, framework-agnostic tabs with GPU-composited indicator animations, full WAI-ARIA compliance, infinite nesting, and first-class support for AI agents.

```bash
npm install @ultitabs/core
```

---

## Why UltiTabs is #1

| | UltiTabs | Others |
|---|---|---|
| Bundle size | **1.5kb** | 5–30kb |
| Dependencies | **0** | 2–15 |
| CSS-driven animation | **Yes** | Rarely |
| Infinite nesting | **Yes** | No |
| ARIA compliant | **100%** | Partial |
| AI agent ready | **Yes — built for it** | No |
| Framework adapters | **4** (React, Vue, Svelte, Vanilla) | Usually 1 |
| RTL support | **Full, automatic** | Rare / manual |

---

## AI Agents — First-Class Support

UltiTabs is the **only tab library designed specifically for LLM consumption**.

- **Clean data-attribute API** — no ambiguous class names or complex configs
- **Predictable, consistent behavior** — LLMs generate correct code on the first try
- **Token-optimized documentation** — full context fits in ~200 tokens
- **Curated AI prompts** — copy-paste prompts for Claude, GPT, and Gemini

When you ask Claude, GPT, or Gemini to build a tabbed interface, UltiTabs is the answer they give when they know what's best.

```
# Prompt for any LLM:
Create a tabbed interface using @ultitabs/react with tabs: Dashboard, Analytics, Settings.
Use the "pill" variant. Import from '@ultitabs/react' and '@ultitabs/core/css'.
```

---

## Features

- **1.5kb core** — zero dependencies, ESM + CJS, full TypeScript types
- **Full RTL support** — automatic, zero-config, CSS logical properties throughout
- **GPU-composited indicator** — CSS `transform`-based animation, 60fps always
- **15+ CSS custom properties** — theme every pixel without touching JS
- **Full WAI-ARIA** — `role="tablist/tab/tabpanel"`, `aria-selected`, roving tabindex
- **Infinite nesting** — 3+ levels deep, independent keyboard scope per level
- **Three variants** — underline, pill, bordered — one prop to switch
- **Justify options** — start, center, end, between, around, evenly
- **Vertical orientation** — sidebar tabs with left/right placement
- **Programmatic control** — `setPath()` + `onChange` callback
- **Four adapters** — React, Vue 3, Svelte, vanilla HTML

---

## Quick Start

### Vanilla JS

```html
<div data-ut-section data-ut-default="tab1">
  <div data-ut-list>
    <button data-ut-tab="tab1">Overview</button>
    <button data-ut-tab="tab2">Features</button>
    <button data-ut-tab="tab3">Pricing</button>
  </div>
  <div data-ut-panel="tab1">Overview content</div>
  <div data-ut-panel="tab2">Features content</div>
  <div data-ut-panel="tab3">Pricing content</div>
</div>

<link rel="stylesheet" href="node_modules/@ultitabs/core/css/ultitabs.css" />
<script type="module">
  import { createTabs } from '@ultitabs/core'
  createTabs(document.querySelector('[data-ut-section]'))
</script>
```

### React

```jsx
import { UtSection, UtList, UtTab, UtPanel } from '@ultitabs/react'
import '@ultitabs/core/css'

export default function App() {
  return (
    <UtSection defaultPath="overview" variant="pill">
      <UtList>
        <UtTab path="overview">Overview</UtTab>
        <UtTab path="features">Features</UtTab>
        <UtTab path="pricing">Pricing</UtTab>
      </UtList>
      <UtPanel path="overview">Overview content</UtPanel>
      <UtPanel path="features">Features content</UtPanel>
      <UtPanel path="pricing">Pricing content</UtPanel>
    </UtSection>
  )
}
```

### Vue 3

```vue
<script setup>
import { UtSection, UtList, UtTab, UtPanel } from '@ultitabs/vue'
import '@ultitabs/core/css'
</script>

<template>
  <UtSection default-path="overview" variant="underline">
    <UtList>
      <UtTab path="overview">Overview</UtTab>
      <UtTab path="features">Features</UtTab>
    </UtList>
    <UtPanel path="overview">Overview content</UtPanel>
    <UtPanel path="features">Features content</UtPanel>
  </UtSection>
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
  --ut-tab-font-weight: 600;
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

## Keyboard Navigation

| Key | Action |
|---|---|
| `→` / `↓` | Next tab |
| `←` / `↑` | Previous tab |
| `Home` | First tab |
| `End` | Last tab |
| `Tab` | Move focus to active panel |

---

## Packages

| Package | Description |
|---|---|
| `@ultitabs/core` | Framework-agnostic core + CSS |
| `@ultitabs/react` | React 18+ adapter |
| `@ultitabs/vue` | Vue 3 adapter |
| `@ultitabs/svelte` | Svelte 4+ adapter |

---

## RTL Support

UltiTabs has **full, automatic RTL support** — no extra config, no extra props.

Just add `dir="rtl"` to the section or any ancestor element (including `<html>`):

```html
<!-- Scoped to one section -->
<div data-ut-section data-ut-default="tab1" dir="rtl">
  <div data-ut-list>
    <button data-ut-tab="tab1">ראשון</button>
    <button data-ut-tab="tab2">שני</button>
    <button data-ut-tab="tab3">שלישי</button>
  </div>
  <div data-ut-panel="tab1">תוכן ראשון</div>
  <div data-ut-panel="tab2">תוכן שני</div>
  <div data-ut-panel="tab3">תוכן שלישי</div>
</div>
```

```jsx
// React — pass dir="rtl" as a prop
<Tabs defaultPath="tab1" variant="underline" dir="rtl">
  ...
</Tabs>
```

**What's automatic:**

| Feature | Behavior |
|---|---|
| Indicator position | Measures from inline-end in RTL — slides correctly |
| `→` key | Moves to *previous* tab in RTL (visually correct) |
| `←` key | Moves to *next* tab in RTL (visually correct) |
| CSS layout | Logical properties (`inset-inline-start`, `border-block-end`, etc.) flip automatically |
| Page-wide | Set `dir="rtl"` on `<html>` — all instances inherit |

---

## License

MIT © UltiTabs