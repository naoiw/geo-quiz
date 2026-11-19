import type { Country } from "../../country-data";
import type { Locale } from "../../i18n/messages";

export type NameChoiceScope = "region" | "world";

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
 * Questions always come from the selected region. Distractors may use that region
 * or the worldwide catalogue, and must have unique IDs and displayed names.
 */
export function createCountryNameChoices(
  correctCountryId: string,
  pool: readonly Country[],
  locale: Locale,
  random: () => number = Math.random,
  distractorPool: readonly Country[] = pool,
): CountryNameChoice[] {
  const correct = pool.find((country) => country.id === correctCountryId);
  if (!correct) throw new Error("Correct country is missing from the question pool.");

  const normalize = (label: string) => label.normalize("NFKC").trim().toLocaleLowerCase(locale);
  const labels = new Set([normalize(correct.names[locale])]);
  const ids = new Set([correctCountryId]);
  const candidates: CountryNameChoice[] = [];
  for (const country of distractorPool) {
    const label = country.names[locale];
    const normalized = normalize(label);
    if (!ids.has(country.id) && !labels.has(normalized)) {
      ids.add(country.id);
      labels.add(normalized);
      candidates.push({ countryId: country.id, label });
    }
  }
  if (candidates.length < 3) throw new Error("At least four unique country names are required.");

  const incorrect = shuffle(candidates, random).slice(0, 3);
  return shuffle([{ countryId: correct.id, label: correct.names[locale] }, ...incorrect], random);
}
