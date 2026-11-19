#!/usr/bin/env node
/**
 * Fails when the English and Spanish locale files do not define the same
 * nested translation keys. Compares flattened leaf paths (e.g. "nav.home")
 * and reports every missing or extra key relative to the English baseline.
 *
 * Usage: node scripts/check-i18n-parity.mjs [base.json] [other.json]
 *   Defaults to src/i18n/locales/en.json and src/i18n/locales/es.json.
 */
import { readFileSync } from "node:fs";

const [basePath = "src/i18n/locales/en.json", otherPath = "src/i18n/locales/es.json"] =
  process.argv.slice(2);

function leafKeys(value, prefix = "", out = new Set()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      leafKeys(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.add(prefix);
  }
  return out;
}

const load = (path) => leafKeys(JSON.parse(readFileSync(path, "utf8")));
const base = load(basePath);
const other = load(otherPath);

const missing = [...base].filter((key) => !other.has(key)).sort();
const extra = [...other].filter((key) => !base.has(key)).sort();

for (const key of missing) console.error(`missing in ${otherPath}: ${key}`);
for (const key of extra) console.error(`extra in ${otherPath}: ${key}`);

if (missing.length || extra.length) {
  console.error(`Locale key mismatch: ${missing.length} missing, ${extra.length} extra.`);
  process.exit(1);
}
console.log(`Locale keys match (${base.size} keys).`);
