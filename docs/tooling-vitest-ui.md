# Making `npm run test:ui` Work From a Clean Install

Tracks issue #255.

## Problem

`package.json` defines:

```json
"test:ui": "vitest --ui"
```

`--ui` needs the `@vitest/ui` package, which is not declared in
`devDependencies`. After `npm ci`, running `npm run test:ui` makes Vitest stop
and ask to install the missing package interactively. That prompt fails in
non-interactive shells and leaves `package.json` / `package-lock.json` changed on
contributors' machines.

## Fix

Add `@vitest/ui` at the **same version as the installed `vitest`**. Vitest and
its sub-packages are released in lockstep; mismatched versions print a warning
or fail to start.

1. Check the locked Vitest version:

   ```bash
   npm ls vitest
   # @synapsvault/web@1.0.0
   # └── vitest@5.0.5
   ```

2. Install the matching UI package as a dev dependency:

   ```bash
   npm install --save-dev @vitest/ui@5.0.5
   ```

   Pin it to the same range style as `vitest` in `package.json`
   (e.g. `"@vitest/ui": "^5.0.5"` next to `"vitest": "^5.0.5"`), so both move
   together on future upgrades.

3. Commit **both** `package.json` and `package-lock.json`.

## Verification

Run from a clean tree so nothing cached hides the problem:

```bash
rm -rf node_modules
npm ci                 # must succeed with no lockfile changes
git status --short     # expect: no output
npm ls @vitest/ui vitest
npm run test:ui        # opens the UI with no "install @vitest/ui?" prompt
```

To check it in a non-interactive shell (closer to CI), start the UI without
opening a browser and confirm it serves:

```bash
CI=1 npx vitest --ui --open=false &
sleep 5 && curl -sf http://localhost:51204/__vitest__/ >/dev/null && echo "UI up"
kill %1
```

## Upgrading Vitest later

When bumping `vitest`, bump `@vitest/ui` (and any other `@vitest/*` package,
such as `@vitest/coverage-v8`) to the same version in the same PR:

```bash
npm install --save-dev vitest@<version> @vitest/ui@<version>
```
