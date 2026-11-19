import type { RegionId } from "../country-data/regions";

/** Question format and answer format are separate by design. */
export type QuizKind =
  | "map-to-name"
  | "flag-to-name"
  | "name-to-map"
  | "name-to-flag";

export type AnswerFormat = "text" | "multiple-choice" | "map" | "flag";
export type SessionRule = "ten-untimed" | "ten-timed" | "time-attack";

export interface GameConfiguration {
  quizKind: QuizKind;
  answerFormat: AnswerFormat;
  sessionRule: SessionRule;
  regionId: RegionId | null;
}
