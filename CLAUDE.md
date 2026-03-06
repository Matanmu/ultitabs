# UltiTabs — CLAUDE.md

## Projects

| Path | Purpose |
|---|---|
| `/Users/matanmu/Proj/ultitabs/` | npm package / GitHub repo (the library) |
| `/Users/matanmu/Proj/ultitabs-site/` | Marketing + docs website |

They are the **same project**. Changes to the library should be reflected in the site (docs, examples, release notes).

---

## Library (`/ultitabs/lib/`)

### Build
```bash
pnpm --filter ultitabs build   # build once
pnpm --filter ultitabs dev     # watch mode
```

### Publish to npm
```bash
cd lib && npm publish --otp=YOUR_OTP_CODE
```
Always bump `lib/package.json` version, update `lib/CHANGELOG.md`, and sync README before publishing.

### Key files
| File | Purpose |
|---|---|
| `lib/src/tabs.ts` | Core `createTabs()` — the main logic |
| `lib/src/types.ts` | All TypeScript types (TabsConfig, TabsInstance, etc.) |
| `lib/src/index.ts` | Entry point — exports + auto-init on DOMContentLoaded |
| `lib/src/aria.ts` | WAI-ARIA setup and keyboard navigation |
| `lib/src/indicator.ts` | GPU-composited indicator animation |
| `lib/css/ultitabs.css` | Shipped CSS — variants, orientations, overflow, transitions |
| `lib/CHANGELOG.md` | Version history |

### CSS prefix: `ut-`
- Data attributes: `data-ut-section`, `data-ut-list`, `data-ut-tab`, `data-ut-panel`, `data-ut-auto`, `data-ut-default`, `data-ut-disabled`
- CSS variables: `--ut-indicator-color`, `--ut-tab-color`, `--ut-transition-duration`, etc.
- CSS classes set by the library: `data-ut-active`, `data-ut-variant`, `data-ut-orientation`

### Current version: `1.3.0`
Features shipped:
- `variant`: underline / pill / bordered
- `orientation`: horizontal / vertical + `side`: left / right
- `justify`: start / center / end / between / around / evenly
- `syncUrl`: syncs active tab to URL hash
- `persist`: session / local storage
- `data-ut-disabled`: disable individual tabs
- `data-ut-auto` + `data-ut-default`: zero-JS auto-init
- `overflow`: scroll arrows when tabs overflow container
- `transition`: fade / slide panel animations
- `onChange` returning `false` cancels tab switch

### When adding a feature
1. Update `lib/src/types.ts` first
2. Implement in `lib/src/tabs.ts`
3. Add CSS to `lib/css/ultitabs.css` if needed
4. Bump version in `lib/package.json`
5. Update `lib/CHANGELOG.md`
6. Sync `README.md` → `lib/README.md` (always keep in sync: `cp README.md lib/README.md`)
7. Add demo component + playground section on the site
8. **Update `/ultitabs-site/client/src/pages/docs/ReleaseNotes.jsx`**

---

## Website (`/ultitabs-site/`)

### Stack
- Vite + React (client at `client/`)
- Express server (server at `server/`) — only used for `/api/github-stars`
- SCSS modules (`client/src/styles/`)
- PrismJS for code highlighting

### Deploy
```bash
cd /Users/matanmu/Proj/ultitabs-site && ./deploy.sh
```
Then: **Cloudways → your app → Deployment via Git → Pull**

The deploy script: builds client, force-adds `client/dist`, commits with timestamp, pushes to GitHub.

### Key paths
| Path | Purpose |
|---|---|
| `client/src/pages/PlaygroundPage.jsx` | All interactive examples — one section per feature |
| `client/src/pages/docs/` | All docs pages |
| `client/src/pages/docs/ReleaseNotes.jsx` | **Must update for every feature/fix** |
| `client/src/components/` | Shared components + demo components |
| `client/src/data/codeExamples.js` | All code snippets shown in the playground |
| `client/src/styles/_playground.scss` | Examples page + sidebar styles |
| `client/src/styles/_docs.scss` | Docs page styles |
| `client/src/styles/_tabs.scss` | UltiTabs demo CSS (site-specific) |
| `client/public/llms.txt` | GEO — AI crawler context file |
| `client/public/sitemap.xml` | SEO sitemap |

### Adding a new playground example
1. Add code snippets to `client/src/data/codeExamples.js` (JS + HTML + AI Prompt variants)
2. Create demo component in `client/src/components/YourDemo.jsx`
3. Add section to `PlaygroundPage.jsx` with `id` attribute for sidebar scroll-spy
4. The sidebar (`NAV_ITEMS` array at top of `PlaygroundPage.jsx`) must include the new section

### Adding a new docs page
1. Create `client/src/pages/docs/YourPage.jsx`
2. Add route in `client/src/App.jsx`
3. Add link in `client/src/pages/docs/DocsLayout.jsx` → `NAV_GROUPS`

### Sidebar scroll-spy (Examples page)
Uses `IntersectionObserver` with `rootMargin: '-20% 0px -70% 0px'`. Each `<section>` needs a unique `id` matching an entry in `NAV_ITEMS`.

### Docs layout
Same visual style as Examples — sticky left sidebar listing all doc pages grouped by category. Content is full-width prose. No fixed right-side TOC.

---

## Important rules

- **Always update `ReleaseNotes.jsx`** for any feature, fix, or notable change
- **Always keep `README.md` and `lib/README.md` in sync** — copy after every change
- The `tsconfig.base.json` warning during build is pre-existing and non-blocking — ignore it
- Cloudways uses **Hybrid Stack** (not Lightning Stack) — this is required for React Router to work
- The site's `client/.gitignore` excluded `dist/` — `deploy.sh` uses `git add -f client/dist` to force-include it
- `onChange` in `TabsConfig` is called BEFORE state changes (for cancellation), then `listeners` (`.on('change')`) are called after commit
