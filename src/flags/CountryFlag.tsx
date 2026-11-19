import type { Country } from "../country-data";
import { getCountryName } from "../country-data";
import type { Locale } from "../i18n/messages";
import "./CountryFlag.css";

export interface CountryFlagProps {
  country: Country;
  locale: Locale;
}

/** Loads a bundled SVG with the Vite base path (GitHub Pages or future Android). */
export function CountryFlag({ country, locale }: CountryFlagProps) {
  const countryName = getCountryName(country, locale);
  const alt = locale === "ja" ? countryName + "の国旗" : "Flag of " + countryName;

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
