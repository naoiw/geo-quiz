import { useEffect, useMemo, useRef, useState } from "react";
import { countries, findCountry, getCountryName, regions } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { AnswerFormat, GameSession, SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";
import { QuizFeedback, QuizProgress, QuizResultSummary } from "./QuizStatus";
import { WorldMap } from "../../map/WorldMap";
import { CountryFlag } from "../../flags/CountryFlag";
import { createCountryNameChoices } from "./name-choices";
import { CountryChoiceGrid } from "./CountryChoiceGrid";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import "./NameQuiz.css";

type NameAnswerFormat = Extract<AnswerFormat, "text" | "multiple-choice">;

interface Props {
  locale: Locale;
  kind: "map-to-name" | "flag-to-name";
}

const durations = [60, 120, 180, 300] as const;

export function NameQuiz({ locale, kind }: Props) {
  const isJa = locale === "ja";
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const isFlag = kind === "flag-to-name";
  const [answerFormat, setAnswerFormat] = useState<NameAnswerFormat>("text");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [durationSeconds, setDurationSeconds] = useState<number>(120);
  const insufficientCountries = countRegionCountries(regionId) <
    (answerFormat === "multiple-choice" ? 4 : 1);
  const [session, setSession] = useState<GameSession | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [clockMs, setClockMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  // Some mobile IMEs dispatch compositionend just before the Enter key event.
  const suppressCompositionEnter = useRef(false);

  const question = session?.currentQuestion;
  const country = session ? getQuestionCountry(session) : null;
  const flagRegion = isFlag && country
    ? regions.find((region) => region.id === country.regionIds[0])
    : null;
  const review = session?.status === "review" ? session.lastReview : null;
  const correctCountry = review ? findCountry(review.correctCountryId) : null;
  const result = session?.status === "finished" ? getResult(session) : null;

  const choices = useMemo(() => {
    if (!session?.currentQuestion || session.configuration.answerFormat !== "multiple-choice") {
      return [];
    }
    return createCountryNameChoices(
      session.currentQuestion.countryId, session.countryPool, locale,
    );
  }, [question?.number, question?.countryId, session?.countryPool, session?.configuration.answerFormat, locale]);

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

  useEffect(() => {
    if (session?.status === "asking" && session.configuration.answerFormat === "text") {
      inputRef.current?.focus();
    }
  }, [session?.status, question?.number, session?.configuration.answerFormat]);

  const timeLeft = session && session.deadlineMs !== null
    ? getRemainingMs(session, Math.max(clockMs, session.startedAtMs))
    : null;

  const start = () => {
    if (insufficientCountries) return;
    const now = Date.now();
    setSession(startSession({
      quizKind: kind,
      answerFormat,
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    }, countries, {
      nowMs: now,
      ...(sessionRule === "ten-untimed" ? {} : { durationMs: durationSeconds * 1000 }),
    }));
    composing.current = false;
    suppressCompositionEnter.current = false;
    setAnswerText("");
    setClockMs(now);
  };

  const answerWithText = () => {
    if (!answerText.trim() || composing.current) return;
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? submitAnswer(previous, { format: "text", value: answerText }, locale, now)
      : previous);
  };

  const answerWithChoice = (countryId: string) => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? submitAnswer(previous, { format: "multiple-choice", countryId }, locale, now)
      : previous);
  };

  const skip = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? skipQuestion(previous, now)
      : previous);
  };

  const next = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "review"
      ? advanceSession(previous, now)
      : previous);
    setAnswerText("");
    composing.current = false;
    suppressCompositionEnter.current = false;
  };

  const changeToSetup = () => {
    setSession(null);
    setAnswerText("");
    composing.current = false;
    suppressCompositionEnter.current = false;
  };

  return (
    <section id={kind + "-quiz"} className="quiz" aria-labelledby={kind + "-quiz-title"}>
      <div className="section-heading">
        <div>
          <h2 id={kind + "-quiz-title"}>{isFlag
            ? (qt("flagNameTitle"))
            : (qt("mapNameTitle"))}</h2>
          <p>{isFlag
            ? (qt("flagNameIntro"))
            : (qt("mapNameIntro"))}</p>
        </div>
        <span className="section-count">{qt("playable")}</span>
      </div>

      {!session && (
        <div className="quiz__setup">
          <div className="quiz__settings">
            <label className="quiz__label">
              {qt("answerFormat")}
              <select value={answerFormat} onChange={(event) =>
                setAnswerFormat(event.target.value as NameAnswerFormat)}>
                <option value="text">{qt("typeName")}</option>
                <option value="multiple-choice">{qt("fourChoices")}</option>
              </select>
            </label>
            <RegionSelector
              locale={locale}
              value={regionId}
              onChange={setRegionId}
              sessionRule={sessionRule}
              minimumCountries={answerFormat === "multiple-choice" ? 4 : 1}
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
          <p className="quiz__note">{qt("scoring_is_provisional_100_for_correct_0_otherwise_time")}</p>
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
            number={question?.number ?? 1}
            limit={session.questionLimit}
            rule={session.configuration.sessionRule}
            score={session.score}
            remainingMs={timeLeft}
            reviewed={session.status === "review"}
          />
          <p className="quiz__prompt">
            {isFlag
              ? (qt("which_country_does_this_flag_represent"))
              : (qt("which_country_is_highlighted"))}
          </p>
          {isFlag ? (
            <div className="quiz__flag-prompt">
              {country && (
                <CountryFlag
                  country={country}
                  locale={locale}
                  alt={qt("questionFlag")}
                />
              )}
              {flagRegion && (
                <span className="quiz__region-hint">
                  {qt("regionPrefix")}{flagRegion.names[locale]}
                </span>
              )}
            </div>
          ) : (
            <WorldMap
              locale={locale}
              mode="highlight"
              highlightedCountryId={question?.countryId ?? null}
              focusCountryId={question?.countryId ?? null}
              readOnly
            />
          )}
          {session.configuration.answerFormat === "text" ? (
            <form className="quiz__answer-form" onSubmit={(event) => {
              event.preventDefault();
              answerWithText();
            }}>
              <label htmlFor={kind + "-answer-name"}>
                {qt("enterCountry")}
              </label>
              <p className="quiz__input-help" id={kind + "-answer-help"}>
                {qt("official_and_accepted_alternative_names_are_supported_confirm_your")}
              </p>
              <div className="quiz__answer-input-row">
                <input
                  id={kind + "-answer-name"}
                  aria-describedby={kind + "-answer-help"}
                  ref={inputRef}
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  onCompositionStart={() => {
                    composing.current = true;
                    suppressCompositionEnter.current = false;
                  }}
                  onCompositionEnd={() => {
                    composing.current = false;
                    suppressCompositionEnter.current = true;
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      if (!composing.current) suppressCompositionEnter.current = false;
                      return;
                    }
                    if (composing.current || event.nativeEvent.isComposing ||
                      event.nativeEvent.keyCode === 229 || suppressCompositionEnter.current) {
                      event.preventDefault();
                      suppressCompositionEnter.current = false;
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === "Enter" && !composing.current) {
                      suppressCompositionEnter.current = false;
                    }
                  }}
                  disabled={session.status !== "asking"}
                  placeholder={qt("namePlaceholder")}
                  autoComplete="off"
                  autoCapitalize="off"
                  enterKeyHint="done"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="quiz__primary"
                  disabled={session.status !== "asking" || !answerText.trim()}>
                  {qt("submit")}
                </button>
              </div>
            </form>
          ) : (
            <CountryChoiceGrid
              choices={choices}
              label={qt("countryChoices")}
              disabled={session.status !== "asking"}
              correctCountryId={review?.correctCountryId}
              selectedCountryId={review?.answer?.format === "multiple-choice"
                ? review.answer.countryId : null}
              onSelect={answerWithChoice}
              renderChoice={(choice) => choice.label}
            />
          )}
          {session.status === "asking" && (
            <div className="quiz__actions">
              <button type="button" className="quiz__secondary" onClick={skip}>
                {qt("skip")}
              </button>
            </div>
          )}
          {review && (
            <QuizFeedback
              locale={locale}
              judgement={review.judgement}
              correctName={correctCountry ? getCountryName(correctCountry, locale) : review.correctCountryId}
              onContinue={next}
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
              const answerCountry = record.answer?.format !== "text" && record.answer
                ? findCountry(record.answer.countryId) : null;
              const answer = record.answer?.format === "text"
                ? record.answer.value
                : record.answer ? (answerCountry ? getCountryName(answerCountry, locale) : record.answer.countryId) : null;
              return (
                <li key={record.question.number}>
                  <span className={"quiz__history-marker quiz__history-marker--" + record.judgement}>
                    {record.judgement === "correct" ? "✓" : record.judgement === "skipped" ? "−" : "×"}
                  </span>
                  <span>{correct ? getCountryName(correct, locale) : record.correctCountryId}</span>
                  {answer !== null && record.judgement !== "correct" && (
                    <span className="quiz__history-answer">
                      {qt("yourAnswer")}{answer}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={changeToSetup}>
            {qt("playAgain")}
          </button>
        </div>
      )}
    </section>
  );
}
