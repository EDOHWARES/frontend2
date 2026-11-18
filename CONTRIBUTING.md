# Contributing to SynapsVault Frontend

A Stellar-powered marketplace UI built with React, TypeScript, Vite, and Tailwind CSS.

## Local Development

### Prerequisites
- Node.js 20+
- npm (or pnpm)

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set VITE_API_URL to your backend (default: http://localhost:3000)

# Start dev server
npm run dev
# Open http://localhost:5173
```

Dev server includes hot module reload and TypeScript checking.

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

### Test setup and automatic cleanup

`src/test/setup.ts` runs before every test file (configured in `vite.config.ts` via `setupFiles`). It does two things automatically so individual tests do not have to.

**React Testing Library cleanup**

After each test, `cleanup()` from `@testing-library/react` unmounts every component tree that was rendered during that test and removes its DOM nodes. This is registered with Vitest's `afterEach`:

```ts
afterEach(() => {
  cleanup();
});
```

Without this, rendered components would accumulate across tests in the same file, causing false query matches, event-listener leaks, and unpredictable failures.

**jsdom environment shims**

jsdom does not implement every browser API. The setup file patches two gaps that several hooks depend on:

| Shim | Why it is needed |
|------|-----------------|
| `window.matchMedia` | `useTheme()` calls `window.matchMedia('(prefers-color-scheme: dark)')` unconditionally on mount. jsdom leaves this undefined, throwing a `TypeError`. The shim returns a minimal object (`matches: false`, no-op `addEventListener`/`removeEventListener`). |
| `globalThis.localStorage` | `useTheme()` and `useWalletConnection()` read and write `localStorage` on mount. Some jsdom configurations leave it undefined. The shim provides a `Map`-backed in-memory `Storage` object. |

The shims apply globally for the entire test run, so you do not need to mock either API in individual test files.

**Restoring test-specific mocks**

When a test overrides a global or module export with `vi.spyOn` or `vi.fn()`, restore it after the test so it does not affect others. The simplest approach is `vi.restoreAllMocks()` in an `afterEach`:

```ts
import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});
```

Alternatively, pass `restoreMocks: true` in the Vitest config to restore every spy automatically. If you only need to reset call counts and return values without removing the spy, use `vi.clearAllMocks()` instead.

**Example: overriding `localStorage` for one test**

The global shim covers the happy path. When you need to test error handling or a specific stored value, replace the shim locally and restore it afterwards:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  let getItemSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(globalThis.localStorage, "getItem");
  });

  afterEach(() => {
    vi.restoreAllMocks(); // removes the spy, restores the shim's original getItem
  });

  it("defaults to light theme when nothing is stored", () => {
    getItemSpy.mockReturnValue(null);
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  it("restores dark theme from storage", () => {
    getItemSpy.mockReturnValue("dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });
});
```

The `cleanup()` registered in the setup file unmounts the rendered tree after each test, and `vi.restoreAllMocks()` removes the `getItem` spy, so neither the DOM state nor the mock leaks into the next test.

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

1. **Create component:** `src/pages/MyPage.tsx`
2. **Add route:** Update `src/App.tsx`
3. **Add tests:** `src/pages/MyPage.test.tsx`
4. **Update nav:** Add link in main navigation
5. **Test:** `npm run dev` and verify routing works

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

Uses Stellar Freighter for wallet connection. See `src/api/agent.ts` for integration patterns.

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
