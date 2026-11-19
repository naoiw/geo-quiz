import { useEffect, useMemo, useRef, useState } from "react";
import { countries, findCountry, getCountryName, regions } from "../../country-data";
import type { RegionId } from "../../country-data";
import {
  advanceSession, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { AnswerFormat, GameSession, SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { WorldMap } from "../../map/WorldMap";
import { createCountryNameChoices } from "./name-choices";
import "./MapToNameQuiz.css";

type NameAnswerFormat = Extract<AnswerFormat, "text" | "multiple-choice">;
type RegionSelection = RegionId | "world";

interface Props {
  locale: Locale;
}

const durations = [60, 120, 180, 300] as const;

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
    String(seconds % 60).padStart(2, "0");
}

export function MapToNameQuiz({ locale }: Props) {
  const isJa = locale === "ja";
  const [answerFormat, setAnswerFormat] = useState<NameAnswerFormat>("text");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [durationSeconds, setDurationSeconds] = useState<number>(120);
  const [session, setSession] = useState<GameSession | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [clockMs, setClockMs] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const composing = useRef(false);

  const question = session?.currentQuestion;
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
    const now = Date.now();
    setSession(startSession({
      quizKind: "map-to-name",
      answerFormat,
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    }, countries, {
      nowMs: now,
      ...(sessionRule === "ten-untimed" ? {} : { durationMs: durationSeconds * 1000 }),
    }));
    composing.current = false;
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
  };

  const changeToSetup = () => {
    setSession(null);
    setAnswerText("");
    composing.current = false;
  };

  return (
    <section id="map-to-name-quiz" className="quiz" aria-labelledby="map-quiz-title">
      <div className="section-heading">
        <div>
          <h2 id="map-quiz-title">{isJa ? "地図 → 国名クイズ" : "Map → Country quiz"}</h2>
          <p>{isJa
            ? "黄色く強調された国を見て、国名を回答しよう。"
            : "Identify the country highlighted in yellow."}</p>
        </div>
        <span className="section-count">{isJa ? "プレイ可能" : "PLAYABLE"}</span>
      </div>

      {!session && (
        <div className="quiz__setup">
          <div className="quiz__settings">
            <label className="quiz__label">
              {isJa ? "回答方式" : "Answer format"}
              <select value={answerFormat} onChange={(event) =>
                setAnswerFormat(event.target.value as NameAnswerFormat)}>
                <option value="text">{isJa ? "国名を入力" : "Type a country"}</option>
                <option value="multiple-choice">{isJa ? "国名を四択" : "Four choices"}</option>
              </select>
            </label>
            <label className="quiz__label">
              {isJa ? "出題地域" : "Region"}
              <select value={regionId} onChange={(event) =>
                setRegionId(event.target.value as RegionSelection)}>
                <option value="world">{isJa ? "全世界（197）" : "World (197)"}</option>
                {regions.map((region) => {
                  const count = countries.filter((item) => item.regionIds.includes(region.id)).length;
                  return (
                    <option key={region.id} value={region.id}>
                      {region.names[locale] + " (" + count + ")"}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="quiz__label">
              {isJa ? "ゲームルール" : "Game rule"}
              <select value={sessionRule} onChange={(event) =>
                setSessionRule(event.target.value as SessionRule)}>
                <option value="ten-untimed">{isJa ? "10問・時間無制限" : "10 questions · untimed"}</option>
                <option value="ten-timed">{isJa ? "10問・時間制限" : "10 questions · timed"}</option>
                <option value="time-attack">{isJa ? "タイムアタック" : "Time attack"}</option>
              </select>
            </label>
            {sessionRule !== "ten-untimed" && (
              <label className="quiz__label">
                {isJa ? "制限時間" : "Time limit"}
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
          <p className="quiz__note">{isJa
            ? "配点は暫定で正解100点、誤答・パス0点です。制限時間も今後調整します。"
            : "Scoring is provisional: +100 for correct, 0 otherwise. Time limits may change."}</p>
          <button type="button" className="quiz__primary" onClick={start}>
            {isJa ? "クイズを開始" : "Start quiz"}
          </button>
        </div>
      )}

      {session && session.status !== "finished" && (
        <div className="quiz__game">
          <div className="quiz__stats" aria-label={isJa ? "ゲームの進行状況" : "Game progress"}>
            <span>{session.configuration.sessionRule === "time-attack"
              ? (isJa ? "第" + question?.number + "問" : "Question " + question?.number)
              : (isJa ? "第" + question?.number + "問 / 10問" : "Question " + question?.number + " / 10")}</span>
            <span>{isJa ? "スコア" : "Score"}: {session.score}</span>
            {timeLeft !== null && (
              <span role="timer" aria-label={isJa ? "残り時間" : "Remaining time"}>
                {formatTime(timeLeft)}
              </span>
            )}
          </div>
          <p className="quiz__prompt">
            {isJa ? "黄色い国の名前は？" : "Which country is highlighted?"}
          </p>
          <WorldMap
            locale={locale}
            mode="highlight"
            highlightedCountryId={question?.countryId ?? null}
            focusCountryId={question?.countryId ?? null}
            readOnly
          />
          {session.configuration.answerFormat === "text" ? (
            <form className="quiz__answer-form" onSubmit={(event) => {
              event.preventDefault();
              answerWithText();
            }}>
              <label htmlFor="quiz-answer-name">
                {isJa ? "国名を入力" : "Enter country name"}
              </label>
              <div className="quiz__answer-input-row">
                <input
                  id="quiz-answer-name"
                  ref={inputRef}
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  onCompositionStart={() => { composing.current = true; }}
                  onCompositionEnd={() => { composing.current = false; }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (composing.current || event.nativeEvent.isComposing)) {
                      event.preventDefault();
                    }
                  }}
                  disabled={session.status !== "asking"}
                  placeholder={isJa ? "例：日本" : "e.g. Japan"}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="quiz__primary"
                  disabled={session.status !== "asking" || !answerText.trim()}>
                  {isJa ? "回答する" : "Submit"}
                </button>
              </div>
            </form>
          ) : (
            <div className="quiz__choices" role="group" aria-label={isJa ? "国名の選択肢" : "Country choices"}>
              {choices.map((choice, index) => {
                const isCorrect = review !== null && choice.countryId === review.correctCountryId;
                const isWrong = review?.answer?.format === "multiple-choice" &&
                  review.answer.countryId === choice.countryId && !isCorrect;
                return (
                  <button
                    type="button"
                    key={choice.countryId}
                    className={"quiz__choice" + (isCorrect ? " quiz__choice--correct" : "") +
                      (isWrong ? " quiz__choice--wrong" : "")}
                    disabled={session.status !== "asking"}
                    onClick={() => answerWithChoice(choice.countryId)}>
                    <span className="quiz__choice-index">{String.fromCharCode(65 + index)}</span>
                    {choice.label}
                  </button>
                );
              })}
            </div>
          )}
          {session.status === "asking" && (
            <div className="quiz__actions">
              <button type="button" className="quiz__secondary" onClick={skip}>
                {isJa ? "パス" : "Skip"}
              </button>
            </div>
          )}
          {review && (
            <div className={"quiz__review quiz__review--" + review.judgement}
              role="status" aria-live="polite">
              <p>
                <strong>{review.judgement === "correct"
                  ? (isJa ? "正解！" : "Correct!")
                  : review.judgement === "skipped"
                    ? (isJa ? "パスしました" : "Skipped")
                    : (isJa ? "不正解" : "Incorrect")}</strong>
                {"　"}
                {isJa ? "正解：" : "Answer: "}
                {correctCountry ? getCountryName(correctCountry, locale) : review.correctCountryId}
              </p>
              <button type="button" className="quiz__primary" onClick={next}>
                {isJa ? "次へ" : "Continue"}
              </button>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="quiz__results" role="region" aria-label={isJa ? "クイズ結果" : "Quiz results"}>
          <h3>{isJa ? "結果発表" : "Results"}</h3>
          <p className="quiz__result-summary">{isJa ? "合計スコア" : "Total score"}: <strong>{result.score}</strong></p>
          <div className="quiz__result-stats">
            <span>{isJa ? "回答数" : "Answered"}: {result.answered}</span>
            <span>{isJa ? "正解" : "Correct"}: {result.correct}</span>
            <span>{isJa ? "不正解" : "Incorrect"}: {result.incorrect}</span>
            <span>{isJa ? "パス" : "Skipped"}: {result.skipped}</span>
            <span>{isJa ? "正答率" : "Accuracy"}: {result.accuracyPercent.toFixed(1)}%</span>
            <span>{isJa ? "経過時間" : "Elapsed"}: {formatTime(result.elapsedMs)}</span>
          </div>
          <p className="quiz__note">
            {result.finishReason === "timeout"
              ? (isJa ? "時間切れです。" : "Time is up.")
              : (isJa ? "10問終了しました。" : "All 10 questions completed.")}
          </p>
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
                      {isJa ? "回答：" : "Your answer: "}{answer}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={changeToSetup}>
            {isJa ? "もう一度遊ぶ" : "Play again"}
          </button>
        </div>
      )}
    </section>
  );
}
