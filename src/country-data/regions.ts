/** Geographic groupings, independent of political recognition. */
export const regions = [
  { id: "africa", names: { ja: "アフリカ", en: "Africa" } },
  { id: "asia", names: { ja: "アジア", en: "Asia" } },
  { id: "europe", names: { ja: "ヨーロッパ", en: "Europe" } },
  { id: "north-america", names: { ja: "北アメリカ", en: "North America" } },
  { id: "south-america", names: { ja: "南アメリカ", en: "South America" } },
  { id: "oceania", names: { ja: "オセアニア", en: "Oceania" } },
] as const;

export type RegionId = (typeof regions)[number]["id"];
