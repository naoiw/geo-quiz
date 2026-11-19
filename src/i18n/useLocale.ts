import { useEffect, useState } from "react";
import type { Locale } from "./messages";

const KEY = "geo-quiz:locale";

function getInitialLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored === "ja" || stored === "en") {
      return stored;
    }
  } catch {
    // Some browsers restrict localStorage.
  }
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(KEY, locale);
    } catch {
      // Language switching works without persistence.
    }
  }, [locale]);

  return { locale, setLocale };
}
