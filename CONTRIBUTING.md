# Contributing to UltiTabs

Thanks for your interest in contributing!

## Setup

```bash
# Clone the repo
git clone https://github.com/Matanmu/ultitabs.git
cd ultitabs

# Install dependencies (requires pnpm)
pnpm install

# Build all packages
pnpm build

# Watch mode for core
cd packages/core && pnpm dev
```

## Project Structure

```
packages/
  core/     — Framework-agnostic core library + CSS
  react/    — React 18+ adapter
  vue/      — Vue 3 adapter
  svelte/   — Svelte 4+ adapter
examples/
  vanilla-html/   — Vanilla JS demo
```

## Making Changes

1. Fork the repo and create a branch: `git checkout -b my-fix`
2. Make your changes in `packages/core/src/`
3. Run `pnpm build` to verify the build passes
4. Add a changeset describing your change: `pnpm changeset`
5. Commit and open a pull request

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning.

When you open a PR that changes behavior, run:

```bash
pnpm changeset
```

Follow the prompts to select which packages changed and describe the change.
The CI will handle versioning and publishing when merged to `main`.

## Reporting Bugs

Open an issue at [github.com/Matanmu/ultitabs/issues](https://github.com/Matanmu/ultitabs/issues).
Please include a minimal reproduction.

## Code Style

- TypeScript strict mode throughout
- No runtime dependencies in `ultitabs`
- CSS uses logical properties for RTL support
- All public APIs must be documented in the README

## License

By contributing, you agree your contributions will be licensed under the MIT License.