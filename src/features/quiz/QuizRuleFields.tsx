import type { SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText } from "../../i18n/quizMessages";

export const QUIZ_DURATIONS_SECONDS = [60, 120, 180, 300] as const;

interface Props {
  locale: Locale;
  sessionRule: SessionRule;
  onSessionRuleChange: (rule: SessionRule) => void;
  durationSeconds: number;
  onDurationChange: (seconds: number) => void;
}

/** Shared session-rule and duration controls for every quiz mode. */
export function QuizRuleFields({
  locale, sessionRule, onSessionRuleChange, durationSeconds, onDurationChange,
}: Props) {
  return (
    <>
      <label className="quiz__label">
        {quizText(locale, "gameRule")}
        <select value={sessionRule} onChange={(event) =>
          onSessionRuleChange(event.target.value as SessionRule)}>
          <option value="ten-untimed">{quizText(locale, "tenUntimed")}</option>
          <option value="ten-timed">{quizText(locale, "tenTimed")}</option>
          <option value="time-attack">{quizText(locale, "timeAttack")}</option>
        </select>
      </label>
      {sessionRule !== "ten-untimed" && (
        <label className="quiz__label">
          {quizText(locale, "timeLimit")}
          <select value={durationSeconds} onChange={(event) =>
            onDurationChange(Number(event.target.value))}>
            {QUIZ_DURATIONS_SECONDS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds / 60} {locale === "ja"
                  ? "分" : seconds === 60 ? "minute" : "minutes"}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
