import records from "./countries.json";
import type { Locale } from "../i18n/messages";
import type { RegionId } from "./regions";

export type CountryClassification = "un-member" | "observer" | "additional";

export interface Country {
  readonly id: string;
  readonly classification: CountryClassification;
  readonly isoAlpha2: string | null;
  readonly isoAlpha3: string | null;
  readonly names: Readonly<Record<Locale, string>>;
  readonly aliases: Readonly<Record<Locale, readonly string[]>>;
  readonly regionIds: readonly RegionId[];
  /** Logical identifier; actual SVG flag files are implemented in Issue #4. */
  readonly flagId: string;
  /** Logical identifier; actual polygons are implemented in Issue #3. */
  readonly geometryId: string;
}

/** Static, versioned data; test suite validates all records. */
export const countries: readonly Country[] = records as unknown as readonly Country[];
export const countriesById: ReadonlyMap<string, Country> = new Map(
  countries.map((country) => [country.id, country]),
);

export function findCountry(id: string): Country | undefined {
  return countriesById.get(id.toUpperCase());
}

export function getCountriesInRegion(regionId: RegionId): Country[] {
  return countries.filter((country) => country.regionIds.includes(regionId));
}

export function getCountryName(country: Country, locale: Locale): string {
  return country.names[locale];
}

export { regions } from "./regions";
export type { RegionId } from "./regions";
