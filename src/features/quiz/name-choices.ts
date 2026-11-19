import type { Country } from "../../country-data";
import type { Locale } from "../../i18n/messages";

export interface CountryNameChoice {
  countryId: string;
  label: string;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("Random source must return a value in [0, 1).");
    }
    const j = Math.floor(value * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shareable by map-to-name and flag-to-name (#18).
 * All choices use the current region pool and have unique displayed names.
 */
export function createCountryNameChoices(
  correctCountryId: string,
  pool: readonly Country[],
  locale: Locale,
  random: () => number = Math.random,
): CountryNameChoice[] {
  const correct = pool.find((country) => country.id === correctCountryId);
  if (!correct) throw new Error("Correct country is missing from the question pool.");

  const labels = new Set([correct.names[locale].normalize("NFKC")]);
  const candidates: CountryNameChoice[] = [];
  for (const country of pool) {
    const label = country.names[locale];
    const normalized = label.normalize("NFKC");
    if (country.id !== correctCountryId && !labels.has(normalized)) {
      labels.add(normalized);
      candidates.push({ countryId: country.id, label });
    }
  }
  if (candidates.length < 3) throw new Error("At least four unique country names are required.");

  const incorrect = shuffle(candidates, random).slice(0, 3);
  return shuffle([{ countryId: correct.id, label: correct.names[locale] }, ...incorrect], random);
}
