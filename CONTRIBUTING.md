# Contributing to UltiTabs

## Setup

```bash
git clone https://github.com/Matanmu/ultitabs.git
cd ultitabs
pnpm install
```

Requires Node 18+ and pnpm 10 (see `packageManager` in the root `package.json`).

## Checks

```bash
pnpm --filter ultitabs format        # biome check --write
pnpm --filter ultitabs format:check
pnpm --filter ultitabs lint
pnpm --filter ultitabs typecheck     # tsc --noEmit for src and for tests
pnpm --filter ultitabs test          # vitest, jsdom
pnpm --filter ultitabs test:coverage
pnpm --filter ultitabs build         # minified ESM/CJS + ultitabs.min.css
pnpm --filter ultitabs size
```

CI runs format, lint, typecheck, tests with coverage, build, and size.

## Layout

```
lib/src/tabs.ts        createTabs()
lib/src/types.ts       public types
lib/src/index.ts       entry + auto-init
lib/src/aria.ts        WAI-ARIA and keyboard
lib/src/indicator.ts   indicator geometry
lib/src/utils.ts       shared helpers
lib/css/ultitabs.css   source CSS
lib/biome.json
lib/vitest.config.ts
lib/tsup.config.ts
lib/tsconfig.json      library typecheck (tests excluded)
lib/tsconfig.test.json test typecheck
```

The root package is a private pnpm workspace. Only `lib/` is published.

## Changesets

This repo versions with [Changesets](https://github.com/changesets/changesets). That is the only release path. Do not bump `lib/package.json` by hand and do not publish to npm from a branch.

```bash
pnpm changeset
```

Merging to `main` lets `.github/workflows/release.yml` open the version PR or publish it.

## Style

- TypeScript strict mode, no runtime dependencies
- Biome formats and lints `lib/` (2-space indent, double quotes)
- CSS uses logical properties and custom properties for color
- Keep `README.md` and `lib/README.md` in sync

## Size

size-limit budgets (minified + gzip), measured from the current build:

- `dist/index.mjs` — 4.6 kB budget (about 4.33 kB today)
- `css/ultitabs.min.css` — 2.1 kB budget (about 1.93 kB today)

## License

By contributing, you agree your contributions are licensed under the MIT License.
