# UltiTabs — CLAUDE.md

This repository is the `ultitabs` library (npm package). The marketing site is a separate checkout and is not in this repo.

## Layout

```
lib/src/tabs.ts          createTabs()
lib/src/types.ts         public types
lib/src/index.ts         exports + auto-init on import
lib/src/aria.ts          roles, selection, keyboard
lib/src/indicator.ts     indicator position (CSS variables, not a transform animation)
lib/src/utils.ts         ids, element lookup, RTL scroll math
lib/css/ultitabs.css     shipped CSS (source). ultitabs.min.css is build output
lib/package.json         the publishable package (version 1.5.0 until Changesets bumps it)
```

Root `package.json` is the private workspace. Tests live next to the source (`lib/src/*.test.ts`) and run in Vitest + jsdom.

## CSS

Prefix `ut-`.

- Attributes: `data-ut-section`, `data-ut-list`, `data-ut-tab`, `data-ut-panel`, `data-ut-auto`, `data-ut-default`, `data-ut-disabled`, `data-ut-theme`
- The script sets `data-ut-variant`, `data-ut-orientation`, `data-ut-side`, `data-ut-justify`, `data-ut-active`, `data-ut-transition`
- Colors are custom properties (`--ut-indicator-color`, `--ut-border-color`, `--ut-panel-bg`, `--ut-pill-track-bg`, `--ut-pill-active-bg`, `--ut-focus-ring-color`, …)
- Default palette is light, including when the OS prefers dark. `data-ut-theme="dark"` opts in. `data-ut-theme="light"` on a section forces light under a dark ancestor.

## Behavior worth not breaking

- Panels pair by matching `data-ut-tab` / `data-ut-panel` when the values agree. Missing or unmatched values fall back to index, which is what 1.5 always did.
- `setPath`, `defaultPath`, the URL hash, and persisted state can still select a disabled id. Clicks ignore it. Arrow keys, Home, and End skip it. Disabled tabs get `aria-disabled`. The active tab keeps `tabindex="0"` even when disabled; every other tab is `-1`.
- Hash format is `#ut-{id|section|tab}-{path}`. Persist keys are `ut-persist-{id|section|index}`.
- `syncUrl` uses `history.replaceState` on init, `popstate`, and `hashchange`. It uses `pushState` only for a user or programmatic change.
- `beforeChange`, then deprecated `onChange`, then `.on("beforeChange")` run before the switch and can return `false`. `.on("change")`, `afterChange`, and `.on("afterChange")` run after commit. `onChange` logs one warning outside production.
- `getPath()` is `TabPath` (a string).
- `createTabs` on a root that already has an instance destroys that instance first. `destroy()` releases listeners, observers, overflow DOM, equal-height styles, and in-flight transitions. It leaves roles, ARIA, hidden, variant attributes, and indicator variables as they were.
- Importing the package auto-inits `[data-ut-section][data-ut-auto]`. `sideEffects` must not be `false`.

## Commands

```bash
pnpm install
pnpm --filter ultitabs format:check
pnpm --filter ultitabs lint
pnpm --filter ultitabs typecheck
pnpm --filter ultitabs test:coverage
pnpm build
pnpm --filter ultitabs size
```

CI (`.github/workflows/ci.yml`) runs that same list.

## Release

Versions and npm publishing go through Changesets only. Do not hand-edit `lib/package.json` `"version"` and do not run `npm publish` from a feature branch.

1. Add a changeset: `pnpm changeset`
2. Merge to `main`
3. `.github/workflows/release.yml` opens the release PR (or publishes when that PR merges)

`lib/CHANGELOG.md` is produced by Changesets. Keep `README.md` and `lib/README.md` identical (`cp README.md lib/README.md`).

The 2.0.0 bump is the changeset in `.changeset/`, not the version field, until the release workflow runs.
