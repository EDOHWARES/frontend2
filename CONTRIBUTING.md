# Contributing to SynapsVault Frontend

A Stellar-powered marketplace UI built with React, TypeScript, Vite, and Tailwind CSS.

## Local Development

### Prerequisites
- Node.js >=24.15.0 (see `engines` in `package.json`)
- npm (or pnpm)

The repo pins its Node version in `.nvmrc`. If you use nvm, run `nvm use` from the
project root to switch to the pinned Node 24 release before installing dependencies.

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — leave VITE_API_URL empty for local development and set
# VITE_DEV_PROXY_TARGET to your backend (e.g. http://localhost:3000)

# Start dev server
npm run dev
# Open http://localhost:5173
```

The Vite dev server provides hot module reload, but it does **not** typecheck your
code — Vite strips types without checking them. Run `npm run typecheck`
(`tsc --noEmit`) separately to catch type errors, and run it before opening a PR.

### API Environment Variables

For local development, keep `VITE_API_URL` **empty** and point
`VITE_DEV_PROXY_TARGET` at your backend instead. The Vite dev server proxies
API requests to that target, which avoids CORS issues and keeps the browser
talking to a single origin. See `.env.example` for the full list of variables.

```bash
# .env (local development)
VITE_API_URL=
VITE_DEV_PROXY_TARGET=http://localhost:3000
```

Only set `VITE_API_URL` when the frontend must call a backend directly (for
example, a deployed environment with a fictional host such as
`https://api.example.test`).

## Docker Development

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
# Open http://localhost:8080
```

## Branch Strategy

| Branch | Purpose | Deploy Target |
|--------|---------|----------------|
| `main` | Production-ready | Vercel → production |
| `dev` | Staging/integration | Vercel preview |
| `feat/*` | Feature branches | PR to `dev` |
| `fix/*` | Bug fixes | PR to `dev` |
| `chore/*` | Maintenance | PR to `dev` |

## Development Workflow

1. **Create feature branch from dev:**
   ```bash
   git checkout -b feat/my-feature dev
   ```

2. **Make changes and test locally:**
   ```bash
   npm run dev
   npm run test:watch
   ```

3. **Before committing, verify:**
   ```bash
   npm run lint        # ESLint passes (CI enforces it)
   npm run typecheck   # Type safety
   npm run test        # All tests pass
   npm run build       # Production build works
   # or simply: npm run check
   ```

   To verify the built output locally, see
   [Previewing a Production Build](#previewing-a-production-build).

4. **Commit with conventional format (see below)**

5. **Push and create PR to `dev`**

6. **After review + merge to `dev`:**
   - Staging deploy to Vercel preview
   - Create release PR to `main`

## Testing

```bash
npm run test           # Run all tests once
npm run test:watch    # Watch mode for development
npm run test:ui       # Visual UI for test runner
```

Tests use Vitest + React Testing Library. Focus on user behavior, not implementation details.

### Vitest UI Peer Dependency

`npm run test:ui` requires the Vitest UI peer dependency (`@vitest/ui`), which
is not installed by default. Install it at the same major version as `vitest`
in `package.json` (for example, `vitest@^5.0.5`):

```bash
npm install -D @vitest/ui@^5.0.5
```

Then run `npm run test:ui` to open the visual test runner.

## Previewing a Production Build

Build the app and serve the generated assets locally:

```bash
npm run build     # Outputs to dist/
npm run preview   # Serves the built assets (default: http://localhost:4173)
```

`npm run preview` serves the files produced by `npm run build` — it does not
run the dev server, hot module reload, or the dev proxy. Use it to check the
production bundle before opening a PR.

## Production Build (build:prod)

```bash
npm run build:prod
```

This runs the production build with `NODE_ENV=production` and writes the
generated assets to the `dist/` directory. Deploy or inspect `dist/` after the
command completes.

## Code Standards

- **TypeScript**: Strict mode, no `any` without comment
- **Components**: Functional components with hooks
- **Styling**: Use semantic Tailwind tokens (`bg-surface`, `text-fg-muted`, `border-line`) — see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Code-split routes, memoize expensive renders
- **Errors**: Use Sentry for tracking, user-friendly error messages

## Design System

Tokens live in `src/styles/tokens.css` and are exposed to Tailwind as semantic
classes that adapt to light/dark automatically. Read
[DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) before adding UI.

## Adding a New Page

Pages are rendered as tabs from `src/App.tsx`; there is no `src/pages` directory.

1. **Create component:** `src/components/MyPage.tsx`
2. **Add tests:** `src/components/MyPage.test.tsx`
3. **Wire it into the tab navigation in `src/App.tsx`:**
   - Extend the `Tab` union with your new tab id (e.g. `'my-page'`)
   - Add a nav entry for the tab in the navigation list
   - Render `<MyPage />` in the tab switch for that id
4. **Test:** `npm run dev` and verify the tab renders and switches correctly

## Commit Format (Conventional Commits)

```
feat(ui): add subscription plan selector
fix(wallet): handle Freighter disconnect race condition
test(catalog): add search filter tests
docs: update component library
refactor(theme): extract color variables to custom properties
chore: upgrade vite to 6.0
perf(catalog): memoize ResourceCard component
```

**Types:** feat, fix, test, docs, refactor, chore, perf, style

## Code Review Checklist

- [ ] Lint passes (`npm run lint`)
- [ ] TypeScript compiles (`npm run typecheck`)
- [ ] Tests pass (`npm run test`)
- [ ] Bundle size acceptable (check Vite output)
- [ ] No hardcoded colors/spacing (use CSS vars)
- [ ] Accessible (keyboard nav, ARIA labels)
- [ ] Mobile responsive (tested at 320px+)
- [ ] Follows conventional commit format
- [ ] PR description explains "why", not "what"

## Wallet Integration

Uses Stellar Freighter for wallet connection.

- [`src/lib/freighter.ts`](./src/lib/freighter.ts) — Freighter helpers such as
  `loadFreighter`, `signWithFreighter`, and `isFreighterInstalled`
- [`src/hooks/useWalletConnection.ts`](./src/hooks/useWalletConnection.ts) — connection
  state, `connect`/`disconnect`, and restore-on-mount behavior

Example public key used in tests and docs: `GABCD...` (placeholder only — never commit
real keys or secrets).

## Payment Integration

Uses x402 protocol via `@x402/fetch` and `@x402/stellar`. See `src/api/payments.ts`.

## Troubleshooting

**Port 5173 already in use?**
```bash
npm run dev -- --port 5174
```

**Build too large?**
```bash
npm run bundle:stats
# Opens stats.html showing bundle breakdown
```

**Tests failing?**
```bash
npm run test:watch
# Rerun on file changes
```

## Questions?

- Open a GitHub issue
- Check existing PRs for similar work
- Ask in Stellar Dev Discord #synapsvault
