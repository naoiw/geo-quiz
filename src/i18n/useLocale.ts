import { useEffect, useState } from "react";
import { translate, type Locale } from "./messages";
import { LOCALE_STORAGE_KEY, resolveLocale } from "./locale";

function getInitialLocale(): Locale {
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    // Storage may be blocked; browsing and language switching must still work.
  }

  const preferred = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  return resolveLocale(stored, preferred);
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "metaTitle");
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (description) description.content = translate(locale, "metaDescription");
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Selection remains active even without persistence.
    }
  }, [locale]);

  return { locale, setLocale };
}
