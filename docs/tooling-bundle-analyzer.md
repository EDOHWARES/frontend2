# Cross-Platform Bundle Analyzer Scripts

Tracks issue #256.

## Problem

`rollup-plugin-visualizer` (configured in `vite.config.ts`) writes
`stats.html` to the project root on every `vite build`. Two scripts then open
it:

```json
"bundle:stats": "tsc && vite build && open stats.html",
"bundle:analyze": "open stats.html"
```

`open` is a macOS command. On Linux it is missing or is an unrelated tool
(`openvt`), and on Windows it does not exist, so both scripts fail for many
contributors — even though the build itself succeeded. `bundle:analyze` also
gives no useful message when `stats.html` has not been generated yet.

## Fix

Replace `open` with a small Node script that picks the right opener for the
current OS and checks the file first.

### `scripts/open-stats.mjs`

```js
#!/usr/bin/env node
// Open the bundle visualizer report in the default browser on any OS.
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const file = resolve(process.argv[2] ?? "stats.html");

if (!existsSync(file)) {
  console.error(`✖ ${file} not found.`);
  console.error("  Run `npm run bundle:stats` (or `npm run build`) to generate it first.");
  process.exit(1);
}

const [cmd, args] =
  process.platform === "darwin" ? ["open", [file]]
  : process.platform === "win32" ? ["cmd", ["/c", "start", "", file]]
  : ["xdg-open", [file]];

const child = spawn(cmd, args, { stdio: "ignore", detached: true });

child.on("error", () => {
  // No GUI opener (headless Linux, containers, Codespaces): don't fail the build.
  console.log(`Bundle report: ${file}`);
  console.log("Open it in a browser manually.");
});

child.unref();
```

### `package.json`

```json
"bundle:stats": "tsc && vite build && node scripts/open-stats.mjs",
"bundle:analyze": "node scripts/open-stats.mjs"
```

## Behavior

| Situation                         | Result                                                     |
| --------------------------------- | ---------------------------------------------------------- |
| macOS                             | Opens with `open`                                          |
| Windows                           | Opens with `start` (empty `""` is the window title arg)    |
| Linux desktop                     | Opens with `xdg-open`                                      |
| Headless Linux / container        | Prints the report path, exits 0                            |
| `stats.html` missing              | Prints how to generate it, exits 1                         |

Bundle generation is unchanged: `vite build` still writes `stats.html`, and
`bundle:check` (which never opened the report) is unaffected.

## Why not a dependency?

The `open` npm package would also work, but it adds a runtime dependency for a
one-line developer convenience. The script above uses only Node built-ins and
lives alongside the existing `scripts/check-bundle-size.mjs`.

## Verification

```bash
rm -f stats.html
npm run bundle:analyze   # expect: "stats.html not found" and exit code 1
npm run bundle:stats     # builds, then opens (or prints the path to) stats.html
npm run bundle:analyze   # opens the existing report
```

Test on at least one non-macOS environment (Linux, Codespaces, or Windows) when
reviewing.
