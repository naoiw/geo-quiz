import { useEffect, useMemo, useState } from "react";
import { countries, findCountry, getCountryName, regions } from "../../country-data";
import type { RegionId } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { GameSession, SessionRule } from "../../game-engine/types";
import { CountryFlag } from "../../flags/CountryFlag";
import type { Locale } from "../../i18n/messages";
import { CountryChoiceGrid } from "./CountryChoiceGrid";
import { createFlagChoices, type FlagChoiceScope } from "./flag-choices";
import "./NameQuiz.css";
import "./NameToFlagQuiz.css";

type RegionSelection = RegionId | "world";
const durations = [60, 120, 180, 300] as const;

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
    String(seconds % 60).padStart(2, "0");
}

/** The fourth game mode: country name -> one of four locally bundled flags. */
export function NameToFlagQuiz({ locale }: { locale: Locale }) {
  const isJa = locale === "ja";
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [scope, setScope] = useState<FlagChoiceScope>("region");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [durationSeconds, setDurationSeconds] = useState(120);
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
    return createFlagChoices(question.countryId, session.countryPool, countries, { scope });
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
          <h2 id="name-to-flag-quiz-title">{isJa ? "国名 → 国旗クイズ" : "Country → Flag quiz"}</h2>
          <p>{isJa
            ? "表示された国名に対応する国旗を4枚から選ぼう。"
            : "Choose the flag that belongs to the named country."}</p>
        </div>
        <span className="section-count">{isJa ? "プレイ可能" : "PLAYABLE"}</span>
      </div>

      {!session && (
        <div className="quiz__setup">
          <div className="quiz__settings">
            <label className="quiz__label">
              {isJa ? "出題地域" : "Question region"}
              <select value={regionId} onChange={(event) =>
                setRegionId(event.target.value as RegionSelection)}>
                <option value="world">{isJa ? "全世界（197）" : "World (197)"}</option>
                {regions.map((region) => {
                  const count = countries.filter((country) => country.regionIds.includes(region.id)).length;
                  return (
                    <option key={region.id} value={region.id}>
                      {region.names[locale] + " (" + count + ")"}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="quiz__label">
              {isJa ? "誤答国旗の範囲" : "Other flag choices"}
              <select value={scope} onChange={(event) => setScope(event.target.value as FlagChoiceScope)}>
                <option value="region">{isJa ? "出題地域内" : "Within question region"}</option>
                <option value="world">{isJa ? "全世界" : "Worldwide"}</option>
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
            ? "国旗をタップすると回答を確定します。配点は暫定で正答100点、誤答・パス0点です。"
            : "Tap a flag to submit. Provisional scoring: +100 correct, 0 for incorrect or skipped."}</p>
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
              : (isJa ? "第" + question?.number + "問 / 10問" :
                "Question " + question?.number + " / 10")}</span>
            <span>{isJa ? "スコア" : "Score"}: {session.score}</span>
            {remainingMs !== null && (
              <span role="timer" aria-label={isJa ? "残り時間" : "Remaining time"}>
                {formatTime(remainingMs)}
              </span>
            )}
          </div>

          <p className="quiz__prompt">
            {isJa ? "「" : "Choose the flag of "}<strong>
              {questionCountry ? getCountryName(questionCountry, locale) : question?.countryId}
            </strong>{isJa ? "」の国旗は？" : "."}
          </p>

          <CountryChoiceGrid
            variant="flag"
            label={isJa ? "4つの国旗から回答" : "Choose one of four flags"}
            choices={options}
            disabled={session.status !== "asking"}
            correctCountryId={review?.correctCountryId}
            selectedCountryId={selectedId}
            onSelect={answer}
            renderChoice={(country, index) => (
              <CountryFlag
                country={country}
                locale={locale}
                alt={(isJa ? "選択肢" : "Option ") +
                  String.fromCharCode(65 + index) + (isJa ? "の国旗" : " flag")}
              />
            )}
          />
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
                {questionCountry ? getCountryName(questionCountry, locale) : review.correctCountryId}
                {review.judgement === "incorrect" && selectedId && (
                  <span className="quiz__flag-your-answer">
                    {isJa ? "選んだ国旗：" : "Your flag: "}
                    {findCountry(selectedId) ? getCountryName(findCountry(selectedId)!, locale) : selectedId}
                  </span>
                )}
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
          <p className="quiz__result-summary">
            {isJa ? "合計スコア" : "Total score"}: <strong>{result.score}</strong>
          </p>
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
                      {isJa ? "選択：" : "Chosen: "}
                      {choice ? getCountryName(choice, locale) : record.answer.countryId}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={() => setSession(null)}>
            {isJa ? "もう一度遊ぶ" : "Play again"}
          </button>
        </div>
      )}
    </section>
  );
}
