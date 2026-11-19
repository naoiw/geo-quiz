import { useEffect, useMemo, useState } from "react";
import { countries, findCountry, getCountryName } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { GameSession, SessionRule } from "../../game-engine/types";
import { CountryFlag } from "../../flags/CountryFlag";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";
import { CountryChoiceGrid } from "./CountryChoiceGrid";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import { createFlagChoices, type FlagChoiceScope } from "./flag-choices";
import "./NameQuiz.css";
import "./NameToFlagQuiz.css";

const durations = [60, 120, 180, 300] as const;

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
    String(seconds % 60).padStart(2, "0");
}

/** The fourth game mode: country name -> one of four locally bundled flags. */
export function NameToFlagQuiz({ locale }: { locale: Locale }) {
  const isJa = locale === "ja";
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [scope, setScope] = useState<FlagChoiceScope>("region");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [durationSeconds, setDurationSeconds] = useState(120);
  const insufficientCountries = countRegionCountries(regionId) < (scope === "region" ? 4 : 1);
  const [session, setSession] = useState<GameSession | null>(null);
  const [clockMs, setClockMs] = useState(0);

  const question = session?.currentQuestion;
  const questionCountry = session ? getQuestionCountry(session) : null;
  const review = session?.status === "review" ? session.lastReview : null;
  const result = session?.status === "finished" ? getResult(session) : null;
  const selectedId = review?.answer?.format === "flag" ? review.answer.countryId : null;

  // The candidate set is stable throughout a question and its review, including
  // when the timer ticks. Only the question number/ID or fixed game pool changes it.
  const options = useMemo(() => {
    if (!question || !session) return [];
    return createFlagChoices(question.countryId, session.countryPool, countries, { scope })
      .map((country) => ({ countryId: country.id, country }));
  }, [question?.number, question?.countryId, session?.countryPool, scope]);

  useEffect(() => {
    if (!session || session.deadlineMs === null || session.status === "finished") return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClockMs(now);
      setSession((previous) => previous && previous.status !== "finished"
        ? tickSession(previous, now)
        : previous);
    }, 250);
    return () => window.clearInterval(interval);
  }, [session?.deadlineMs, session?.status]);

  const remainingMs = session && session.deadlineMs !== null
    ? getRemainingMs(session, Math.max(clockMs, session.startedAtMs))
    : null;

  const start = () => {
    if (insufficientCountries) return;
    const now = Date.now();
    setSession(startSession({
      quizKind: "name-to-flag",
      answerFormat: "flag",
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    }, countries, {
      nowMs: now,
      ...(sessionRule === "ten-untimed" ? {} : { durationMs: durationSeconds * 1000 }),
    }));
    setClockMs(now);
  };

  const answer = (countryId: string) => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? submitAnswer(previous, { format: "flag", countryId }, locale, now)
      : previous);
  };

  const skip = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? skipQuestion(previous, now) : previous);
  };

  const next = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "review"
      ? advanceSession(previous, now) : previous);
  };

  return (
    <section className="quiz" id="name-to-flag-quiz" aria-labelledby="name-to-flag-quiz-title">
      <div className="section-heading">
        <div>
          <h2 id="name-to-flag-quiz-title">{qt("nameFlagTitle")}</h2>
          <p>{qt("nameFlagIntro")}</p>
        </div>
        <span className="section-count">{qt("playable")}</span>
      </div>

      {!session && (
        <div className="quiz__setup">
          <div className="quiz__settings">
            <RegionSelector
              locale={locale}
              value={regionId}
              onChange={setRegionId}
              sessionRule={sessionRule}
              minimumCountries={scope === "region" ? 4 : 1}
            />
            <label className="quiz__label">
              {qt("distractorScope")}
              <select value={scope} onChange={(event) => setScope(event.target.value as FlagChoiceScope)}>
                <option value="region">{qt("withinRegion")}</option>
                <option value="world">{qt("worldwide")}</option>
              </select>
            </label>
            <label className="quiz__label">
              {qt("gameRule")}
              <select value={sessionRule} onChange={(event) =>
                setSessionRule(event.target.value as SessionRule)}>
                <option value="ten-untimed">{qt("tenUntimed")}</option>
                <option value="ten-timed">{qt("tenTimed")}</option>
                <option value="time-attack">{qt("timeAttack")}</option>
              </select>
            </label>
            {sessionRule !== "ten-untimed" && (
              <label className="quiz__label">
                {qt("timeLimit")}
                <select value={durationSeconds} onChange={(event) =>
                  setDurationSeconds(Number(event.target.value))}>
                  {durations.map((seconds) => (
                    <option key={seconds} value={seconds}>
                      {seconds / 60} {isJa ? "分" : seconds === 60 ? "minute" : "minutes"}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <p className="quiz__note">{qt("tap_a_flag_to_submit_provisional_scoring_100_correct")}</p>
          <button type="button" className="quiz__primary" onClick={start}
            disabled={insufficientCountries}>
            {qt("startQuiz")}
          </button>
        </div>
      )}

      {session && session.status !== "finished" && (
        <div className="quiz__game">
          <div className="quiz__stats" aria-label={qt("gameProgress")}>
            <span>{session.configuration.sessionRule === "time-attack"
              ? (isJa ? "第" + question?.number + "問" : "Question " + question?.number)
              : (isJa ? "第" + question?.number + "問 / " + session.questionLimit + "問" :
                "Question " + question?.number + " / " + session.questionLimit)}</span>
            <span>{qt("score")}: {session.score}</span>
            {remainingMs !== null && (
              <span role="timer" aria-label={qt("remainingTime")}>
                {formatTime(remainingMs)}
              </span>
            )}
          </div>

          <p className="quiz__prompt">
            {qt("flagPromptStart")}<strong>
              {questionCountry ? getCountryName(questionCountry, locale) : question?.countryId}
            </strong>{qt("flagPromptEnd")}
          </p>

          <CountryChoiceGrid
            variant="flag"
            label={qt("flagChoices")}
            choices={options}
            disabled={session.status !== "asking"}
            correctCountryId={review?.correctCountryId}
            selectedCountryId={selectedId}
            onSelect={answer}
            renderChoice={(country, index) => (
              <CountryFlag
                country={country.country}
                locale={locale}
                alt={(qt("optionPrefix")) +
                  String.fromCharCode(65 + index) + (qt("flagSuffix"))}
              />
            )}
          />
          {session.status === "asking" && (
            <div className="quiz__actions">
              <button type="button" className="quiz__secondary" onClick={skip}>
                {qt("skip")}
              </button>
            </div>
          )}

          {review && (
            <div className={"quiz__review quiz__review--" + review.judgement}
              role="status" aria-live="polite">
              <p>
                <strong>{review.judgement === "correct"
                  ? (qt("correctNotice"))
                  : review.judgement === "skipped"
                    ? (qt("skippedNotice"))
                    : (qt("incorrectNotice"))}</strong>
                {"　"}
                {qt("answerPrefix")}
                {questionCountry ? getCountryName(questionCountry, locale) : review.correctCountryId}
                {review.judgement === "incorrect" && selectedId && (
                  <span className="quiz__flag-your-answer">
                    {qt("yourFlag")}
                    {findCountry(selectedId) ? getCountryName(findCountry(selectedId)!, locale) : selectedId}
                  </span>
                )}
              </p>
              <button type="button" className="quiz__primary" onClick={next}>
                {qt("continue")}
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="quiz__results" role="region" aria-label={qt("quizResults")}>
          <h3>{qt("results")}</h3>
          <p className="quiz__result-summary">
            {qt("totalScore")}: <strong>{result.score}</strong>
          </p>
          <div className="quiz__result-stats">
            <span>{qt("answered")}: {result.answered}</span>
            <span>{qt("correctCount")}: {result.correct}</span>
            <span>{qt("incorrectNotice")}: {result.incorrect}</span>
            <span>{qt("skippedNotice_2")}: {result.skipped}</span>
            <span>{qt("accuracy")}: {result.accuracyPercent.toFixed(1)}%</span>
            <span>{qt("elapsed")}: {formatTime(result.elapsedMs)}</span>
          </div>
          <p className="quiz__note">
            {result.finishReason === "timeout"
              ? (qt("timeUp"))
              : (isJa ? result.answered + "問終了しました。" :
                "All " + result.answered + " questions completed.")}
          </p>
          <ol className="quiz__history">
            {result.history.map((record) => {
              const correct = findCountry(record.correctCountryId);
              const choice = record.answer?.format === "flag"
                ? findCountry(record.answer.countryId) : null;
              return (
                <li key={record.question.number}>
                  <span className={"quiz__history-marker quiz__history-marker--" + record.judgement}>
                    {record.judgement === "correct" ? "✓" :
                      record.judgement === "skipped" ? "−" : "×"}
                  </span>
                  <span>{correct ? getCountryName(correct, locale) : record.correctCountryId}</span>
                  {record.judgement === "incorrect" && record.answer?.format === "flag" && (
                    <span className="quiz__history-answer">
                      {qt("chosenPrefix")}
                      {choice ? getCountryName(choice, locale) : record.answer.countryId}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={() => setSession(null)}>
            {qt("playAgain")}
          </button>
        </div>
      )}
    </section>
  );
}
