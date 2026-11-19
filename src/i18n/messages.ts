export type Locale = "ja" | "en";

const messages = {
  ja: {
    tagline: "GEOGRAPHY · FLAGS · QUIZ",
    heading: "世界を、もっと知ろう。",
    intro: "地図の位置と国旗から、世界の国々を学ぶクイズ。",
    foundation: "開発基盤を準備しました",
    foundationBody: "現在は画面構成のプレビューです。出題データとゲーム機能は順次追加します。",
    modes: "4つのクイズ",
    modesBody: "各クイズの出題画面は今後実装します。",
    mapToName: "地図 → 国名",
    mapToNameBody: "地図上で強調された国の名前を当てる。",
    flagToName: "国旗 → 国名",
    flagToNameBody: "表示された国旗から国の名前を当てる。",
    nameToMap: "国名 → 地図",
    nameToMapBody: "国名を見て地図の正しい場所を選ぶ。",
    nameToFlag: "国名 → 国旗",
    nameToFlagBody: "国名から正しい国旗を四択で選ぶ。",
    planned: "開発予定",
    nextStep: "次の開発",
    nextStepBody: "国マスタ、国旗データ、2D世界地図を順に整備します。",
    language: "表示言語",
  },
  en: {
    tagline: "GEOGRAPHY · FLAGS · QUIZ",
    heading: "Explore the world.",
    intro: "Learn countries through maps, locations and flags.",
    foundation: "Project foundation is ready",
    foundationBody: "This is a layout preview. Country datasets and playable quizzes will follow.",
    modes: "Four quiz formats",
    modesBody: "Playable questions are not implemented yet.",
    mapToName: "Map → Country",
    mapToNameBody: "Name the highlighted country on a map.",
    flagToName: "Flag → Country",
    flagToNameBody: "Name the country shown by a flag.",
    nameToMap: "Country → Map",
    nameToMapBody: "Find the named country on the map.",
    nameToFlag: "Country → Flag",
    nameToFlagBody: "Choose the correct flag from four options.",
    planned: "Planned",
    nextStep: "What's next",
    nextStepBody: "Country records, flag assets and a 2D world map will be added next.",
    language: "Language",
  },
};

export type MessageKey = keyof typeof messages.ja;

export function translate(locale: Locale, key: MessageKey): string {
  return messages[locale][key];
}
