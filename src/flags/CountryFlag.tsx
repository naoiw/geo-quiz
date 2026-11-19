import type { Country } from "../country-data";
import { getCountryName } from "../country-data";
import type { Locale } from "../i18n/messages";
import "./CountryFlag.css";

export interface CountryFlagProps {
  country: Country;
  locale: Locale;
  /** Override the accessible label in quiz prompts to avoid leaking the answer. */
  alt?: string;
}

/** Loads a bundled SVG with the Vite base path (GitHub Pages or future Android). */
export function CountryFlag({ country, locale, alt: altOverride }: CountryFlagProps) {
  const countryName = getCountryName(country, locale);
  const alt = altOverride ?? (locale === "ja" ? countryName + "の国旗" : "Flag of " + countryName);

  return (
    <img
      className="country-flag"
      src={import.meta.env.BASE_URL + "flags/" + country.flagId.toLowerCase() + ".svg"}
      alt={alt}
      width={320}
      height={240}
      loading="lazy"
      decoding="async"
    />
  );
}
