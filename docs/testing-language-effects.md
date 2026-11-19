# Testing Language Effects When Storage Fails

Tracks issue #253.

`applyLanguageEffects` (source: `src/i18n/config.ts`) runs whenever the UI
language changes. It has two jobs:

1. Set `<html lang>` so screen readers and the browser use the right language.
2. Persist the choice to `localStorage` under `LANGUAGE_STORAGE_KEY`
   (`"synapsvault-lang"`).

```ts
export function applyLanguageEffects(lang: SupportedLanguage): void {
  if (typeof document !== "undefined" && document.documentElement) {
    document.documentElement.lang = lang;
  }
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Non-fatal: language still applies for this session.
  }
}
```

Storage can throw in private browsing, sandboxed iframes, or when the quota is
full. The DOM update must still happen, and the function must not throw. The
tests should prove both the happy path and the failure path.

## Example — `src/i18n/config.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import i18n, { applyLanguageEffects, LANGUAGE_STORAGE_KEY } from "./config.js";

describe("applyLanguageEffects", () => {
  let originalLanguage: string;
  let originalHtmlLang: string;
  let originalStored: string | null;

  beforeEach(() => {
    originalLanguage = i18n.language;
    originalHtmlLang = document.documentElement.lang;
    originalStored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  });

  afterEach(async () => {
    vi.restoreAllMocks(); // undo any storage spies first
    document.documentElement.lang = originalHtmlLang;
    if (originalStored === null) localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    else localStorage.setItem(LANGUAGE_STORAGE_KEY, originalStored);
    await i18n.changeLanguage(originalLanguage);
  });

  it("updates <html lang> and persists to the expected storage key", () => {
    applyLanguageEffects("es");

    expect(document.documentElement.lang).toBe("es");
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("es");
    expect(LANGUAGE_STORAGE_KEY).toBe("synapsvault-lang");
  });

  it("still updates the DOM when storage throws", () => {
    document.documentElement.lang = "en";
    const setItem = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new DOMException("Storage disabled", "SecurityError");
    });

    expect(() => applyLanguageEffects("es")).not.toThrow();

    expect(setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, "es");
    expect(document.documentElement.lang).toBe("es");
  });
});
```

## Key points

**Spy on the `localStorage` object, not `Storage.prototype`.** In this repo's
Vitest setup (`src/test/setup.ts`), `localStorage` can be a plain in-memory
shim rather than a real `Storage` instance. `vi.spyOn(Storage.prototype,
"setItem")` would then never intercept the call. `vi.spyOn(localStorage,
"setItem")` works with both the shim and jsdom's real implementation.

**Restore spies explicitly.** `vitest.config.ts` does not enable
`restoreMocks`, so a spy that throws would leak into every later test that
writes to storage. Call `vi.restoreAllMocks()` (or `setItem.mockRestore()`) in
`afterEach`.

**Restore global state: `<html lang>`, the stored key, and the i18n language.**
All three are shared across tests in the same worker. Snapshot them in
`beforeEach` and put them back in `afterEach`, restoring the spy *before*
writing the stored value back.

**Assert the call happened, not just that nothing threw.** Checking
`setItem` was called with `(LANGUAGE_STORAGE_KEY, "es")` proves the failure
path was actually exercised, rather than the function skipping storage
altogether.

**Prefer `applyLanguageEffects` over `i18n.changeLanguage` for these tests.**
`changeLanguage` reaches the same function through the `languageChanged`
listener, but also loads resources and re-renders consumers. Calling the
function directly keeps the test focused on the side effects.
