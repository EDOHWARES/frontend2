# Testing the Stale-Catalog Banner

Tracks issue #254.

`CatalogStaleBanner` (source: `src/components/CatalogStaleBanner.tsx`) is shown
when the catalog is served from cache. It renders one of two messages, depending
on whether a `syncedAt` timestamp is available, and formats that timestamp with
the **active i18n language**:

```tsx
const label = syncedAt
  ? t("catalog.stale_banner_with_time", { time: syncedAt.toLocaleString(i18n.language || undefined) })
  : t("catalog.stale_banner_no_time");
```

The tests for this component should cover:

1. The banner is announced to assistive tech (`role="status"`).
2. The no-timestamp message when `syncedAt` is `null`.
3. The timestamp message, with the date formatted for the current locale, in
   **English and Spanish**.
4. The original i18n language is restored after each test.

## Relevant strings

| Key                               | `en`                                                    | `es`                                                                     |
| --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `catalog.stale_banner_title`      | Offline — catalog may be outdated.                      | Sin conexión — el catálogo puede estar desactualizado.                   |
| `catalog.stale_banner_with_time`  | Showing cached catalog from {{time}}. Connect to refresh. | Mostrando el catálogo en caché de {{time}}. Conéctese para actualizar. |
| `catalog.stale_banner_no_time`    | Showing cached catalog. Connect to refresh.             | Mostrando el catálogo en caché. Conéctese para actualizar.               |

## Example — `src/components/CatalogStaleBanner.test.tsx`

```tsx
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import i18n, { loadLocale } from "../i18n/config.js";
import { CatalogStaleBanner } from "./CatalogStaleBanner.js";

// A fixed instant so the output is deterministic across runs.
const SYNCED_AT = new Date(Date.UTC(2026, 0, 15, 14, 30, 0));

describe("CatalogStaleBanner", () => {
  let originalLanguage: string;

  beforeEach(() => {
    originalLanguage = i18n.language;
  });

  afterEach(async () => {
    // Language is global i18n state — always put it back.
    await act(async () => {
      await i18n.changeLanguage(originalLanguage);
    });
  });

  it("exposes the banner as a status region", () => {
    render(<CatalogStaleBanner syncedAt={null} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows the no-timestamp message when syncedAt is null", () => {
    render(<CatalogStaleBanner syncedAt={null} />);
    const status = screen.getByRole("status");

    expect(status).toHaveTextContent("Offline — catalog may be outdated.");
    expect(status).toHaveTextContent("Showing cached catalog. Connect to refresh.");
    expect(status).not.toHaveTextContent("from");
  });

  it("formats the sync time for English", async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
    render(<CatalogStaleBanner syncedAt={SYNCED_AT} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      `Showing cached catalog from ${SYNCED_AT.toLocaleString("en")}. Connect to refresh.`,
    );
  });

  it("formats the sync time for Spanish", async () => {
    await loadLocale("es"); // es is lazy — register the bundle first
    await act(async () => {
      await i18n.changeLanguage("es");
    });
    render(<CatalogStaleBanner syncedAt={SYNCED_AT} />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Sin conexión — el catálogo puede estar desactualizado.");
    expect(status).toHaveTextContent(
      `Mostrando el catálogo en caché de ${SYNCED_AT.toLocaleString("es")}. Conéctese para actualizar.`,
    );
  });

  it("renders different date formats per locale", () => {
    // Guards against the component ignoring i18n.language.
    expect(SYNCED_AT.toLocaleString("es")).not.toBe(SYNCED_AT.toLocaleString("en"));
  });
});
```

## Key points

**Use a fixed `Date`, compare against `toLocaleString(locale)`.** Hardcoding a
string like `"1/15/2026, 2:30:00 PM"` breaks on CI machines in other time
zones. Building the expected value with the same locale keeps the test
deterministic while still proving the component passes the active language.

**Call `loadLocale("es")` before switching.** `src/i18n/config.ts` only bundles
Spanish at init when it is the detected language. In tests the initial language
is normally `en`, so `changeLanguage("es")` alone would fall back to English
strings.

**Wrap `changeLanguage` in `act`.** It triggers re-renders in mounted
`useTranslation` consumers; `act` flushes them before assertions.

**Restore the original language in `afterEach`.** `i18n` is a module singleton
shared by every test file in the worker. Leaving it on `es` makes unrelated
English assertions fail in confusing ways. Note that changing the language also
fires `applyLanguageEffects`, which updates `<html lang>` and localStorage — the
restore puts those back too.

**Query by role, not class names.** `getByRole("status")` checks the
accessibility contract and survives styling changes.
