import type { Country } from "../country-data";
import type { RegionId } from "../country-data/regions";

export type QuizKind = "map-to-name" | "flag-to-name" | "name-to-map" | "name-to-flag";
export type AnswerFormat = "text" | "multiple-choice" | "map" | "flag";
export type SessionRule = "ten-untimed" | "ten-timed" | "time-attack";
export type SessionStatus = "asking" | "review" | "finished";
export type FinishReason = "completed" | "timeout" | "exhausted";

export interface GameConfiguration {
  quizKind: QuizKind;
  answerFormat: AnswerFormat;
  sessionRule: SessionRule;
  regionId: RegionId | null;
}
export type GameMode = Pick<GameConfiguration, "quizKind" | "answerFormat">;

export interface ScoringPolicy {
  /** Arbitrary integer points, including negative penalties. */
  correct: number;
  incorrect: number;
  skipped: number;
}

export interface Question {
  /** One-based question number. */
  number: number;
  countryId: string;
  quizKind: QuizKind;
  answerFormat: AnswerFormat;
}

export type Answer =
  | { format: "text"; value: string }
  | { format: "multiple-choice" | "map" | "flag"; countryId: string };

export type Judgement = "correct" | "incorrect" | "skipped";

export interface AnswerRecord {
  question: Question;
  judgement: Judgement;
  answer: Answer | null;
  correctCountryId: string;
  points: number;
  answeredAtMs: number;
}

export interface GameSession {
  readonly configuration: GameConfiguration;
  readonly countryPool: readonly Country[];
  readonly eligibleCountryIds: readonly string[];
  readonly remainingCountryIds: readonly string[];
  readonly currentQuestion: Question | null;
  readonly history: readonly AnswerRecord[];
  readonly lastReview: AnswerRecord | null;
  readonly status: SessionStatus;
  readonly scoring: ScoringPolicy;
  readonly score: number;
  readonly startedAtMs: number;
  readonly deadlineMs: number | null;
  readonly finishedAtMs: number | null;
  readonly finishReason: FinishReason | null;
}

export interface SessionOptions {
  /** Injected timestamp (no Date.now inside the engine). */
  nowMs: number;
  /** Required for timed sessions, in milliseconds. */
  durationMs?: number;
  /** Injectable for deterministic sampling; must yield [0,1). */
  random?: () => number;
  scoring?: ScoringPolicy;
}

export interface GameResult {
  configuration: GameConfiguration;
  finishReason: FinishReason;
  score: number;
  answered: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracyPercent: number;
  startedAtMs: number;
  finishedAtMs: number;
  elapsedMs: number;
  history: readonly AnswerRecord[];
}
