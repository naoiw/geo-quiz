import type { QuizKind } from "../../game-engine/types";
import type { MessageKey } from "../../i18n/messages";

export interface QuizModeDefinition {
  id: QuizKind;
  symbol: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}

export const quizModes: readonly QuizModeDefinition[] = [
  { id: "map-to-name", symbol: "🗺️", titleKey: "mapToName", bodyKey: "mapToNameBody" },
  { id: "flag-to-name", symbol: "🏳️", titleKey: "flagToName", bodyKey: "flagToNameBody" },
  { id: "name-to-map", symbol: "📍", titleKey: "nameToMap", bodyKey: "nameToMapBody" },
  { id: "name-to-flag", symbol: "🚩", titleKey: "nameToFlag", bodyKey: "nameToFlagBody" },
];
