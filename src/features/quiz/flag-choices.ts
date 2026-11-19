import type { Country } from "../../country-data";

export type FlagChoiceScope = "region" | "world";

/** Replaceable candidate ordering (e.g. similar-flags-first) without changing the quiz UI. */
export type FlagDistractorRanker = (
  candidates: readonly Country[],
  correct: Country,
  random: () => number,
) => readonly Country[];

export interface FlagChoiceOptions {
  scope: FlagChoiceScope;
  random?: () => number;
  rankDistractors?: FlagDistractorRanker;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error("Random source must return a value in [0, 1).");
    }
    const target = Math.floor(value * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

/**
 * Produce four unique flag IDs (one correct + three distractors).
 * The question pool controls the correct answer; the scope only changes distractors.
 * Fewer than four distinct flags is an explicit configuration error, not a silent fallback.
 */
export function createFlagChoices(
  correctCountryId: string,
  questionPool: readonly Country[],
  catalogue: readonly Country[],
  options: FlagChoiceOptions,
): Country[] {
  const correct = questionPool.find((country) => country.id === correctCountryId);
  if (!correct) throw new Error("Correct country is missing from the question pool.");

  const random = options.random ?? Math.random;
  const source = options.scope === "region" ? questionPool
    : options.scope === "world" ? catalogue
      : null;
  if (!source) throw new Error("Unknown flag choice scope.");

  // The flag master is checked for identical SVG data by tests; logical IDs are
  // also checked here to ensure the same asset is never displayed twice.
  const candidateFlags = new Set([correct.flagId.toUpperCase()]);
  const candidateIds = new Set([correct.id]);
  const candidates: Country[] = [];
  for (const country of source) {
    const flag = country.flagId.toUpperCase();
    if (!candidateIds.has(country.id) && !candidateFlags.has(flag)) {
      candidates.push(country);
      candidateIds.add(country.id);
      candidateFlags.add(flag);
    }
  }
  if (candidates.length < 3) {
    throw new Error("At least four distinct flags are required for a four-choice question.");
  }

  const ordered = options.rankDistractors
    ? options.rankDistractors(candidates, correct, random)
    : shuffle(candidates, random);
  const allowedIds = new Set(candidates.map((country) => country.id));
  const selectedIds = new Set<string>();
  const selectedFlags = new Set([correct.flagId.toUpperCase()]);
  const selected: Country[] = [];
  for (const candidate of ordered) {
    const flag = candidate.flagId.toUpperCase();
    if (!allowedIds.has(candidate.id) || selectedIds.has(candidate.id) || selectedFlags.has(flag)) {
      continue;
    }
    selected.push(candidate);
    selectedIds.add(candidate.id);
    selectedFlags.add(flag);
    if (selected.length === 3) break;
  }
  if (selected.length !== 3) {
    throw new Error("Distractor ranking did not provide three distinct eligible flags.");
  }
  return shuffle([correct, ...selected], random);
}
