import type { Locale } from "./messages";

export const LOCALE_STORAGE_KEY = "geo-quiz:locale";

/** Resolve exact language subtag; never guess unsupported locales into Japanese. */
export function parseLocale(tag: string | null | undefined): Locale | null {
  if (!tag) return null;
  const primary = tag.trim().toLowerCase().replace("_", "-").split("-")[0];
  return primary === "ja" || primary === "en" ? primary : null;
}

/**
 * Stored user choice takes priority. Otherwise scan the browser's preference
 * list in order; fall back to English for unsupported locales.
 */
export function resolveLocale(
  stored: string | null | undefined,
  browserLanguages: readonly string[],
): Locale {
  const preference = parseLocale(stored);
  if (preference) return preference;
  for (const language of browserLanguages) {
    const candidate = parseLocale(language);
    if (candidate) return candidate;
  }
  return "en";
}
