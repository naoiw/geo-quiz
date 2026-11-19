import { useEffect, useState } from "react";
import { countries, findCountry, getCountryName } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { GameSession, SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { WorldMap } from "../../map/WorldMap";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import "./NameQuiz.css";
import "./NameToMapQuiz.css";

const durations = [60, 120, 180, 300] as const;

function formatTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
    String(seconds % 60).padStart(2, "0");
}

/** 2D renderer only: question IDs and judgement remain in the shared game engine. */
export function NameToMapQuiz({ locale }: { locale: Locale }) {
  const isJa = locale === "ja";
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
          <h2 id="name-to-map-quiz-title">{isJa ? "国名 → 地図クイズ" : "Country → Map quiz"}</h2>
          <p>{isJa
            ? "表示された国がある場所を世界地図から選ぼう。"
            : "Find the named country on the world map."}</p>
        </div>
        <span className="section-count">{isJa ? "プレイ可能" : "PLAYABLE"}</span>
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
            ? "スマホの誤タップを防ぐため、国を選んでから「回答を確定」を押します。配点は暫定で正解100点、誤答・パス0点です。"
            : "Select a country, then confirm to prevent accidental taps. Provisional scoring: +100 correct, 0 otherwise."}</p>
          <button type="button" className="quiz__primary" onClick={start}
            disabled={insufficientCountries}>
            {isJa ? "クイズを開始" : "Start quiz"}
          </button>
        </div>
      )}

      {session && session.status !== "finished" && (
        <div className="quiz__game">
          <div className="quiz__stats" aria-label={isJa ? "ゲームの進行状況" : "Game progress"}>
            <span>{session.configuration.sessionRule === "time-attack"
              ? (isJa ? "第" + session.currentQuestion?.number + "問" :
                "Question " + session.currentQuestion?.number)
              : (isJa ? "第" + session.currentQuestion?.number + "問 / " + session.questionLimit + "問" :
                "Question " + session.currentQuestion?.number + " / " + session.questionLimit)}</span>
            <span>{isJa ? "スコア" : "Score"}: {session.score}</span>
            {remainingMs !== null && (
              <span role="timer" aria-label={isJa ? "残り時間" : "Remaining time"}>
                {formatTime(remainingMs)}
              </span>
            )}
          </div>

          <p className="quiz__prompt">
            {isJa ? "「" : "Where is "}<strong>
              {questionCountry ? getCountryName(questionCountry, locale) :
                session.currentQuestion?.countryId}
            </strong>{isJa ? "」はどこ？" : "?"}
          </p>
          <p className="quiz__map-help">
            {review
              ? (isJa ? "黄色が正解の国、青が選択した国です。" :
                "Yellow marks the correct country; blue marks your choice.")
              : (isJa ? "地図の国をタップして選択。ズーム・ドラッグ・表示エリアの変更もできます。" :
                "Tap a country to select it. Zoom, drag or switch the displayed area.")}
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
                  ? (isJa ? "選択中：" : "Selected: ") + getCountryName(selectedCountry, locale)
                  : (isJa ? "まだ国を選択していません。" : "No country selected yet.")}
              </div>
              <div className="quiz__map-buttons">
                <button type="button" className="quiz__secondary" onClick={skip}>
                  {isJa ? "パス" : "Skip"}
                </button>
                <button type="button" className="quiz__primary" onClick={submit} disabled={!selectedId}>
                  {isJa ? "回答を確定" : "Confirm answer"}
                </button>
              </div>
            </div>
          )}

          {review && (
            <div className={"quiz__review quiz__review--" + review.judgement}
              role="status" aria-live="polite">
              <p>
                <strong>{review.judgement === "correct"
                  ? (isJa ? "正解！" : "Correct!")
                  : review.judgement === "skipped" ? (isJa ? "パスしました" : "Skipped")
                    : (isJa ? "不正解" : "Incorrect")}</strong>
                {"　"}
                {isJa ? "正解：" : "Answer: "}
                {questionCountry ? getCountryName(questionCountry, locale) : review.correctCountryId}
                {reviewedChoiceId && review.judgement === "incorrect" && (
                  <span className="quiz__map-your-answer">
                    {isJa ? "あなたの回答：" : "Your choice: "}
                    {findCountry(reviewedChoiceId)
                      ? getCountryName(findCountry(reviewedChoiceId)!, locale) : reviewedChoiceId}
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
              : (isJa ? session.questionLimit + "問終了しました。" :
                "All " + session.questionLimit + " questions completed.")}
          </p>
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
                      {isJa ? "回答：" : "Your answer: "}
                      {choice ? getCountryName(choice, locale) : record.answer.countryId}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <button type="button" className="quiz__primary" onClick={restart}>
            {isJa ? "もう一度遊ぶ" : "Play again"}
          </button>
        </div>
      )}
    </section>
  );
}
