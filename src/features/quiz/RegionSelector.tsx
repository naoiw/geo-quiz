import { countries, regions } from "../../country-data";
import type { RegionId } from "../../country-data";
import { getEligibleCountries, getQuestionLimit } from "../../game-engine/engine";
import type { SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";

export type RegionSelection = RegionId | "world";

export function countRegionCountries(selection: RegionSelection): number {
  return getEligibleCountries(countries, selection === "world" ? null : selection).length;
}

interface Props {
  locale: Locale;
  value: RegionSelection;
  onChange: (selection: RegionSelection) => void;
  sessionRule: SessionRule;
  minimumCountries?: number;
}

/** One source of truth for every quiz mode's regions, labels and question counts. */
export function RegionSelector({
  locale,
  value,
  onChange,
  sessionRule,
  minimumCountries = 1,
}: Props) {
  const isJa = locale === "ja";
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const count = countRegionCountries(value);
  const questionLimit = getQuestionLimit(count, sessionRule);
  const insufficient = count < minimumCountries;

  return (
    <label className="quiz__label">
      {qt("questionRegion")}
      <select value={value} onChange={(event) =>
        onChange(event.target.value as RegionSelection)}>
        <option value="world">{qt("world")} ({countries.length})</option>
        {regions.map((region) => (
          <option key={region.id} value={region.id}>
            {region.names[locale]} ({countRegionCountries(region.id)})
          </option>
        ))}
      </select>
      <span className="quiz__region-summary" role="status" aria-live="polite">
        {isJa
          ? "対象 " + count + "か国・地域" +
            (sessionRule === "time-attack" ? "・時間内に出題" : "・" + questionLimit + "問出題")
          : count + " eligible countries" +
            (sessionRule === "time-attack" ? " · time attack" : " · " + questionLimit + " questions")}
      </span>
      {insufficient && (
        <span className="quiz__region-warning">
          {isJa
            ? "この回答方式には最低 " + minimumCountries + "か国・地域が必要です。"
            : "This answer format needs at least " + minimumCountries + " countries."}
        </span>
      )}
    </label>
  );
}
