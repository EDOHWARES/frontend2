import { afterEach, describe, expect, it, vi } from "vitest";
import { detectInitialLanguage, LANGUAGE_STORAGE_KEY } from "./config.js";

function setBrowserPreferences({
  storedLanguage = null,
  languages = [],
  language = "fr-FR",
}: {
  storedLanguage?: string | null;
  languages?: string[];
  language?: string;
} = {}) {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn().mockReturnValue(storedLanguage),
  });
  vi.stubGlobal("navigator", { languages, language });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectInitialLanguage", () => {
  it("prefers a supported stored language over browser preferences", () => {
    setBrowserPreferences({ storedLanguage: "es", languages: ["en-US"] });

    expect(detectInitialLanguage()).toBe("es");
  });

  it("ignores an unsupported stored language", () => {
    setBrowserPreferences({ storedLanguage: "fr", languages: ["es-MX"] });

    expect(detectInitialLanguage()).toBe("es");
  });

  it("resolves regional browser tags to their supported base language", () => {
    setBrowserPreferences({ language: "ES-mx" });

    expect(detectInitialLanguage()).toBe("es");
  });

  it("uses the first supported entry in navigator.languages", () => {
    setBrowserPreferences({ languages: ["es-MX", "en-US"], language: "en-US" });

    expect(detectInitialLanguage()).toBe("es");
  });

  it("falls back to English when browser preferences are unsupported", () => {
    setBrowserPreferences({ languages: ["fr-FR", "de-DE"], language: "ja-JP" });

    expect(detectInitialLanguage()).toBe("en");
  });

  it("continues to browser preferences when reading storage throws", () => {
    setBrowserPreferences({ languages: ["es-ES"] });
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => {
        expect(key).toBe(LANGUAGE_STORAGE_KEY);
        throw new Error("Storage is unavailable");
      }),
    });

    expect(detectInitialLanguage()).toBe("es");
  });
});
