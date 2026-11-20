# Contributing to UltiTabs

Thanks for your interest in contributing!

## Setup

```bash
# Clone the repo
git clone https://github.com/Matanmu/ultitabs.git
cd ultitabs

# Install dependencies (requires pnpm)
pnpm install

# Build the library
pnpm --filter ultitabs build

# Watch mode
pnpm --filter ultitabs dev

# Run tests
pnpm --filter ultitabs test

# Run tests with coverage
pnpm --filter ultitabs test:coverage
```

## Project Structure

```
lib/
  src/
    tabs.ts       — Core createTabs() logic
    types.ts      — All TypeScript types
    index.ts      — Entry point + auto-init
    aria.ts       — WAI-ARIA setup + keyboard
    indicator.ts  — GPU-composited indicator
    utils.ts      — Shared utilities
  css/
    ultitabs.css  — Shipped CSS (variants, themes, transitions)
  package.json
  tsup.config.ts
  vitest.config.ts
  biome.json      — Linter/formatter config
```

## Making Changes

1. Fork the repo and create a branch: `git checkout -b my-fix`
2. Make your changes in `lib/src/`
3. Run quality checks:
   ```bash
   pnpm --filter ultitabs format      # Format code
   pnpm --filter ultitabs lint        # Lint code
   pnpm --filter ultitabs typecheck   # Type check
   pnpm --filter ultitabs test        # Run tests
   pnpm --filter ultitabs build       # Build
   pnpm --filter ultitabs size        # Check bundle size
   ```
4. Add a changeset describing your change: `pnpm changeset`
5. Commit and open a pull request

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning.

When you open a PR that changes behavior, run:

```bash
pnpm changeset
```

Follow the prompts to select the package and describe the change.
The CI will handle versioning and publishing when merged to `main`.

## Code Style

- TypeScript strict mode throughout
- No runtime dependencies in `ultitabs`
- CSS uses logical properties for RTL support
- CSS colors are tokenized as custom properties
- All public APIs must be documented in the README
- Format with Biome: `pnpm --filter ultitabs format`

## Testing

Tests use Vitest with happy-dom. Run with:

```bash
pnpm --filter ultitabs test           # Run once
pnpm --filter ultitabs test --watch   # Watch mode
pnpm --filter ultitabs test:coverage  # With coverage report
```

## Bundle Size

We track bundle size with size-limit. The budgets are:

- JS (minified + gzip): 2.5 kB
- CSS (minified + gzip): 1.5 kB

Check with: `pnpm --filter ultitabs size`

## Reporting Bugs

Open an issue at [github.com/Matanmu/ultitabs/issues](https://github.com/Matanmu/ultitabs/issues).
Please include a minimal reproduction.

## License

By contributing, you agree your contributions will be licensed under the MIT License.
