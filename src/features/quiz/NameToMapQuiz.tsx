import { useEffect, useState } from "react";
import { countries, findCountry, getCountryName } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { GameSession, SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";
import { QuizFeedback, QuizProgress, QuizResultSummary } from "./QuizStatus";
import { WorldMap } from "../../map/WorldMap";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import "./NameQuiz.css";
import "./NameToMapQuiz.css";

const durations = [60, 120, 180, 300] as const;

/** 2D renderer only: question IDs and judgement remain in the shared game engine. */
export function NameToMapQuiz({ locale }: { locale: Locale }) {
  const isJa = locale === "ja";
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [durationSeconds, setDurationSeconds] = useState(120);
  const insufficientCountries = countRegionCountries(regionId) < 1;
  const [session, setSession] = useState<GameSession | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clockMs, setClockMs] = useState(0);

  const questionCountry = session ? getQuestionCountry(session) : null;
  const review = session?.status === "review" ? session.lastReview : null;
  const result = session?.status === "finished" ? getResult(session) : null;
  const reviewedChoiceId = review?.answer?.format === "map" ? review.answer.countryId : null;
  const mapSelectedId = review ? reviewedChoiceId : selectedId;
  const selectedCountry = selectedId ? findCountry(selectedId) : null;

  useEffect(() => {
    if (!session || session.deadlineMs === null || session.status === "finished") return;
    const interval = window.setInterval(() => {
      const now = Date.now();
      setClockMs(now);
      setSession((previous) => previous && previous.status !== "finished"
        ? tickSession(previous, now) : previous);
    }, 250);
    return () => window.clearInterval(interval);
  }, [session?.deadlineMs, session?.status]);

  const remainingMs = session && session.deadlineMs !== null
    ? getRemainingMs(session, Math.max(clockMs, session.startedAtMs)) : null;

  const start = () => {
    if (insufficientCountries) return;
    const now = Date.now();
    const configuration = {
      quizKind: "name-to-map",
      answerFormat: "map",
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    } as const;
    setSession(startSession(configuration, countries, {
      nowMs: now,
      ...(sessionRule === "ten-untimed" ? {} : { durationMs: durationSeconds * 1000 }),
    }));
    setSelectedId(null);
    setClockMs(now);
  };

  const submit = () => {
    if (!selectedId || session?.status !== "asking") return;
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? submitAnswer(previous, { format: "map", countryId: selectedId }, locale, now)
      : previous);
  };

  const skip = () => {
    if (session?.status !== "asking") return;
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? skipQuestion(previous, now) : previous);
    setSelectedId(null);
  };

  const next = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "review"
      ? advanceSession(previous, now) : previous);
    setSelectedId(null);
  };

  const restart = () => {
    setSession(null);
    setSelectedId(null);
  };

  return (
    <section className="quiz" id="name-to-map-quiz" aria-labelledby="name-to-map-quiz-title">
      <div className="section-heading">
        <div>
          <h2 id="name-to-map-quiz-title">{qt("nameMapTitle")}</h2>
          <p>{qt("nameMapIntro")}</p>
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
            />
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
          <p className="quiz__note">{qt("select_a_country_then_confirm_to_prevent_accidental_taps")}</p>
          <button type="button" className="quiz__primary" onClick={start}
            disabled={insufficientCountries}>
            {qt("startQuiz")}
          </button>
        </div>
      )}

      {session && session.status !== "finished" && (
        <div className="quiz__game">
          <QuizProgress
            locale={locale}
            number={session.currentQuestion?.number ?? 1}
            limit={session.questionLimit}
            rule={session.configuration.sessionRule}
            score={session.score}
            remainingMs={remainingMs}
          />
          <p className="quiz__prompt">
            {qt("mapPromptStart")}<strong>
              {questionCountry ? getCountryName(questionCountry, locale) :
                session.currentQuestion?.countryId}
            </strong>{qt("mapPromptEnd")}
          </p>
          <p className="quiz__map-help">
            {review
              ? (qt("yellow_marks_the_correct_country_blue_marks_your_choice"))
              : (qt("tap_a_country_to_select_it_zoom_drag_or"))}
          </p>

          <WorldMap
            locale={locale}
            mode={review ? "highlight" : "answer"}
            selectedCountryId={mapSelectedId}
            highlightedCountryId={review?.correctCountryId ?? null}
            focusCountryId={review?.correctCountryId ?? null}
            onCountrySelect={session.status === "asking" ? setSelectedId : undefined}
            readOnly={session.status !== "asking"}
            initialRegionId={session.configuration.regionId}
            showRegionNavigation
          />

          {session.status === "asking" && (
            <div className="quiz__map-actions">
              <div className="quiz__map-selection" role="status" aria-live="polite">
                {selectedCountry
                  ? (qt("selectedPrefix")) + getCountryName(selectedCountry, locale)
                  : (qt("noSelection"))}
              </div>
              <div className="quiz__map-buttons">
                <button type="button" className="quiz__secondary" onClick={skip}>
                  {qt("skip")}
                </button>
                <button type="button" className="quiz__primary" onClick={submit} disabled={!selectedId}>
                  {qt("confirmAnswer")}
                </button>
              </div>
            </div>
          )}

          {review && (
            <QuizFeedback
              locale={locale}
              judgement={review.judgement}
              correctName={questionCountry ? getCountryName(questionCountry, locale) : review.correctCountryId}
              onContinue={next}
              details={reviewedChoiceId && review.judgement === "incorrect" ? (
                <span className="quiz__map-your-answer">
                  {qt("yourChoice")}
                  {findCountry(reviewedChoiceId)
                    ? getCountryName(findCountry(reviewedChoiceId)!, locale) : reviewedChoiceId}
                </span>
              ) : null}
            />
          )}
        </div>
      )}

      {result && (
        <div className="quiz__results" role="region" aria-label={qt("quizResults")}>
          <QuizResultSummary locale={locale} result={result} />
          <ol className="quiz__history">
            {result.history.map((record) => {
              const correct = findCountry(record.correctCountryId);
              const choice = record.answer?.format === "map"
                ? findCountry(record.answer.countryId) : null;
              return (
                <li key={record.question.number}>
                  <span className={"quiz__history-marker quiz__history-marker--" + record.judgement}>
                    {record.judgement === "correct" ? "✓" :
                      record.judgement === "skipped" ? "−" : "×"}
                  </span>
                  <span>{correct ? getCountryName(correct, locale) : record.correctCountryId}</span>
                  {record.judgement === "incorrect" && record.answer?.format === "map" && (
                    <span className="quiz__history-answer">
                      {qt("yourAnswer")}
                      {choice ? getCountryName(choice, locale) : record.answer.countryId}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={restart}>
            {qt("playAgain")}
          </button>
        </div>
      )}
    </section>
  );
}
