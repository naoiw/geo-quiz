import type { Country } from "../country-data";
import type { Locale } from "../i18n/messages";
import type {
  Answer, AnswerFormat, AnswerRecord, GameConfiguration, GameResult,
  GameSession, Judgement, Question, ScoringPolicy, SessionOptions,
} from "./types";

export const QUESTIONS_PER_ROUND = 10;

/** Provisional values; the final scoring policy is not yet decided. */
export const DEFAULT_SCORING: Readonly<ScoringPolicy> = Object.freeze({
  correct: 100,
  incorrect: 0,
  skipped: 0,
});

const formats: Readonly<Record<GameConfiguration["quizKind"], readonly AnswerFormat[]>> = {
  "map-to-name": ["text", "multiple-choice"],
  "flag-to-name": ["text", "multiple-choice"],
  "name-to-map": ["map"],
  "name-to-flag": ["flag"],
};

export function getAnswerFormats(kind: GameConfiguration["quizKind"]): readonly AnswerFormat[] {
  const allowed = formats[kind];
  if (!allowed) throw new Error("Unknown quiz kind: " + kind);
  return allowed;
}

export function getEligibleCountries(
  catalogue: readonly Country[],
  regionId: GameConfiguration["regionId"],
): Country[] {
  return catalogue.filter((country) => regionId === null || country.regionIds.includes(regionId));
}

/**
 * Normalize without fuzzy matching: NFKC, whitespace, punctuation typography,
 * case, and hiragana/katakana. Kanji readings must be registered explicitly.
 */
export function normalizeTextAnswer(value: string): string {
  return value.normalize("NFKC")
    .replace(/[‘’]/gu, "'")
    .replace(/[‐‑‒–—−]/gu, "-")
    .trim()
    .replace(/\s+/gu, " ")
    .replace(/\s*([()・])\s*/gu, "$1")
    .replace(/[ぁ-ゖ]/gu, (kana) => String.fromCharCode(kana.charCodeAt(0) + 0x60))
    .toLocaleLowerCase("en");
}

/** Normalize the localized canonical name, explicit aliases and registered readings. */
export function getAcceptedTextAnswers(country: Country, locale: Locale): string[] {
  return [...new Set([
    country.names[locale],
    ...country.aliases[locale],
    ...(country.readings?.[locale] ?? []),
  ].map(normalizeTextAnswer).filter(Boolean))];


export function judgeAnswer(
  question: Question,
  answer: Answer,
  correctCountry: Country,
  locale: Locale,
): Judgement {
  if (answer.format !== question.answerFormat) {
    throw new Error("Answer format does not match the current question.");
  }
  if (question.countryId !== correctCountry.id) {
    throw new Error("Correct country does not match the current question.");
  }
  if (answer.format === "text") {
    const value = normalizeTextAnswer(answer.value);
    return value.length > 0 && getAcceptedTextAnswers(correctCountry, locale).includes(value)
      ? "correct" : "incorrect";
  }
  return answer.countryId.trim().toUpperCase() === question.countryId ? "correct" : "incorrect";
}

function checkTime(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(name + " must be a finite non-negative timestamp.");
  }
}

function checkScoring(scoring: ScoringPolicy): void {
  for (const [key, value] of Object.entries(scoring)) {
    if (!Number.isSafeInteger(value)) throw new Error("Invalid scoring value: " + key);
  }
}

function shuffle(ids: readonly string[], random: () => number): string[] {
  const result = [...ids];
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

function makeQuestion(session: GameSession, countryId: string): Question {
  return {
    number: session.history.length + 1,
    countryId,
    quizKind: session.configuration.quizKind,
    answerFormat: session.configuration.answerFormat,
  };
}

function finish(
  session: GameSession,
  reason: NonNullable<GameSession["finishReason"]>,
  atMs: number,
): GameSession {
  return {
    ...session, status: "finished", currentQuestion: null,
    finishedAtMs: atMs, finishReason: reason,
  };
}

export function startSession(
  configuration: GameConfiguration,
  catalogue: readonly Country[],
  options: SessionOptions,
): GameSession {
  checkTime(options.nowMs, "nowMs");
  if (!getAnswerFormats(configuration.quizKind).includes(configuration.answerFormat)) {
    throw new Error("Unsupported quiz/answer combination.");
  }
  if (!["ten-untimed", "ten-timed", "time-attack"].includes(configuration.sessionRule)) {
    throw new Error("Unknown session rule.");
  }
  const timed = configuration.sessionRule !== "ten-untimed";
  if (timed) {
    if (!Number.isSafeInteger(options.durationMs) || (options.durationMs ?? 0) <= 0) {
      throw new Error("Timed sessions require a positive durationMs.");
    }
  } else if (options.durationMs !== undefined) {
    throw new Error("Untimed sessions must not receive durationMs.");
  }
  const scoring = { ...(options.scoring ?? DEFAULT_SCORING) };
  checkScoring(scoring);
  const eligible = getEligibleCountries(catalogue, configuration.regionId);
  const ids = eligible.map((country) => country.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate country IDs in catalogue.");
  if (ids.length < (configuration.sessionRule === "time-attack" ? 1 : QUESTIONS_PER_ROUND)) {
    throw new Error("Not enough countries in the selected region for this session.");
  }
  const shuffled = shuffle(ids, options.random ?? Math.random);
  const deadlineMs = timed ? options.nowMs + (options.durationMs ?? 0) : null;
  if (deadlineMs !== null && !Number.isSafeInteger(deadlineMs)) {
    throw new Error("Timed session deadline is not a safe integer.");
  }
  return {
    configuration: { ...configuration },
    countryPool: [...eligible],
    eligibleCountryIds: ids,
    remainingCountryIds: shuffled.slice(1),
    currentQuestion: {
      number: 1, countryId: shuffled[0],
      quizKind: configuration.quizKind, answerFormat: configuration.answerFormat,
    },
    history: [], lastReview: null, status: "asking", scoring, score: 0,
    startedAtMs: options.nowMs, deadlineMs, finishedAtMs: null, finishReason: null,
  };
}

export function getQuestionCountry(session: GameSession): Country | null {
  if (!session.currentQuestion) return null;
  return session.countryPool.find((country) => country.id === session.currentQuestion?.countryId) ?? null;
}

export function getRemainingMs(session: GameSession, nowMs: number): number | null {
  checkTime(nowMs, "nowMs");
  if (session.deadlineMs === null) return null;
  return Math.max(0, session.deadlineMs - nowMs);
}

export function tickSession(session: GameSession, nowMs: number): GameSession {
  checkTime(nowMs, "nowMs");
  if (nowMs < session.startedAtMs) throw new Error("Time cannot precede session start.");
  if (session.status === "finished" || session.deadlineMs === null || nowMs < session.deadlineMs) {
    return session;
  }
  if (session.configuration.sessionRule === "ten-timed" && session.history.length === QUESTIONS_PER_ROUND) {
    return finish(session, "completed", session.history.at(-1)?.answeredAtMs ?? nowMs);
  }
  return finish(session, "timeout", session.deadlineMs);
}

function recordAnswer(
  session: GameSession, answer: Answer | null, judgement: Judgement, nowMs: number,
): GameSession {
  if (session.status !== "asking" || !session.currentQuestion) {
    throw new Error("No question is awaiting an answer.");
  }
  const current = tickSession(session, nowMs);
  if (current.status === "finished") return current;
  const question = current.currentQuestion;
  if (!question) throw new Error("Missing current question.");
  const points = current.scoring[judgement];
  const record: AnswerRecord = {
    question, judgement, answer, correctCountryId: question.countryId,
    points, answeredAtMs: nowMs,
  };
  return {
    ...current, status: "review", history: [...current.history, record],
    lastReview: record, score: current.score + points,
  };
}

export function submitAnswer(
  session: GameSession, answer: Answer, locale: Locale, nowMs: number,
): GameSession {
  if (session.status !== "asking" || !session.currentQuestion) {
    throw new Error("No question is awaiting an answer.");
  }
  const current = tickSession(session, nowMs);
  if (current.status === "finished") return current;
  const country = getQuestionCountry(current);
  if (!country || !current.currentQuestion) throw new Error("Question country is not in the catalogue.");
  const judgement = judgeAnswer(current.currentQuestion, answer, country, locale);
  return recordAnswer(current, answer, judgement, nowMs);
}

/** Engine capability only; exposing skip in a UI is a separate product decision. */
export function skipQuestion(session: GameSession, nowMs: number): GameSession {
  return recordAnswer(session, null, "skipped", nowMs);
}

/** Keeps the last judgement visible until the UI advances. */
export function advanceSession(
  session: GameSession, nowMs: number, random: () => number = Math.random,
): GameSession {
  if (session.status !== "review") throw new Error("Advance is only valid after reviewing an answer.");
  if (session.configuration.sessionRule !== "time-attack" && session.history.length >= QUESTIONS_PER_ROUND) {
    checkTime(nowMs, "nowMs");
    if (nowMs < session.startedAtMs) throw new Error("Time cannot precede session start.");
    return finish(session, "completed", nowMs);
  }
  const current = tickSession(session, nowMs);
  if (current.status === "finished") return current;
  let remaining = [...current.remainingCountryIds];
  if (!remaining.length) {
    if (current.configuration.sessionRule !== "time-attack") {
      return finish(current, "exhausted", nowMs);
    }
    remaining = shuffle(current.eligibleCountryIds, random);
    if (remaining.length > 1 && remaining[0] === current.lastReview?.question.countryId) {
      [remaining[0], remaining[1]] = [remaining[1], remaining[0]];
    }
  }
  const [next, ...rest] = remaining;
  return {
    ...current, status: "asking", currentQuestion: makeQuestion(current, next),
    remainingCountryIds: rest, lastReview: null,
  };
}

/** Framework-independent result data; a result UI is handled by a separate Issue. */
export function getResult(session: GameSession): GameResult {
  if (session.status !== "finished" || session.finishedAtMs === null || !session.finishReason) {
    throw new Error("Results are only available after finishing a session.");
  }
  const correct = session.history.filter((entry) => entry.judgement === "correct").length;
  const incorrect = session.history.filter((entry) => entry.judgement === "incorrect").length;
  const skipped = session.history.filter((entry) => entry.judgement === "skipped").length;
  const attempted = correct + incorrect;
  return {
    configuration: { ...session.configuration }, finishReason: session.finishReason,
    score: session.score, answered: session.history.length, correct, incorrect, skipped,
    accuracyPercent: attempted ? 100 * correct / attempted : 0,
    startedAtMs: session.startedAtMs, finishedAtMs: session.finishedAtMs,
    elapsedMs: session.finishedAtMs - session.startedAtMs, history: [...session.history],
  };
}
