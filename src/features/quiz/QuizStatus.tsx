import { useEffect, useRef, type ReactNode } from "react";
import type { GameResult, Judgement, SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText } from "../../i18n/quizMessages";

/** Shared formatting and status UI for all four quiz modes. */
export function formatQuizTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" +
    String(seconds % 60).padStart(2, "0");
}

interface ProgressProps {
  locale: Locale;
  number: number;
  limit: number;
  rule: SessionRule;
  score: number;
  remainingMs: number | null;
}

export function QuizProgress({ locale, number, limit, rule, score, remainingMs }: ProgressProps) {
  const isJa = locale === "ja";
  const timed = rule === "time-attack";
  const progress = timed ? null : Math.min(100, Math.round(100 * (number - 1) / limit));
  return (
    <div className="quiz__progress">
      <div className="quiz__stats" aria-label={quizText(locale, "gameProgress")}>
        <span className="quiz__question-count">
          {isJa ? "第" + number + "問" : "Question " + number}
          {!timed && (isJa ? " / " + limit + "問" : " / " + limit)}
        </span>
        <span className="quiz__score">
          {quizText(locale, "score")}: <strong>{score}</strong>
        </span>
        {remainingMs !== null && (
          <span className="quiz__timer" role="timer" aria-label={quizText(locale, "remainingTime")}>
            {quizText(locale, "remainingTime")}: {formatQuizTime(remainingMs)}
          </span>
        )}
      </div>
      {progress !== null && (
        <div
          className="quiz__progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={number - 1}
          aria-label={quizText(locale, "gameProgress")}
        >
          <div className="quiz__progress-fill" style={{ width: progress + "%" }} />
        </div>
      )}
    </div>
  );
}

interface FeedbackProps {
  locale: Locale;
  judgement: Judgement;
  correctName: string;
  onContinue: () => void;
  details?: ReactNode;
}

/** Next is focused after judging, so review never remains below a tall map on mobile. */
export function QuizFeedback({ locale, judgement, correctName, onContinue, details }: FeedbackProps) {
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    nextRef.current?.focus();
  }, [judgement, correctName]);
  const text = judgement === "correct" ? "correctNotice"
    : judgement === "skipped" ? "skippedNotice" : "incorrectNotice";
  const symbol = judgement === "correct" ? "✓" : judgement === "skipped" ? "−" : "×";
  return (
    <div className={"quiz__review quiz__review--" + judgement}
      role="status" aria-live="polite">
      <div className="quiz__review-message">
        <span className="quiz__review-symbol" aria-hidden="true">{symbol}</span>
        <div>
          <p>
            <strong>{quizText(locale, text)}</strong>{" "}
            {quizText(locale, "answerPrefix")}{correctName}
          </p>
          {details}
        </div>
      </div>
      <button ref={nextRef} type="button" className="quiz__primary" onClick={onContinue}>
        {quizText(locale, "continue")}
      </button>
    </div>
  );
}

export function QuizResultSummary({ locale, result }: { locale: Locale; result: GameResult }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  return (
    <>
      <h3 tabIndex={-1} ref={titleRef}>{quizText(locale, "results")}</h3>
      <p className="quiz__result-summary">
        {quizText(locale, "totalScore")}: <strong>{result.score}</strong>
      </p>
      <div className="quiz__result-stats">
        <span>{quizText(locale, "answered")}: {result.answered}</span>
        <span>{quizText(locale, "correctCount")}: {result.correct}</span>
        <span>{quizText(locale, "incorrectNotice")}: {result.incorrect}</span>
        <span>{quizText(locale, "skippedNotice_2")}: {result.skipped}</span>
        <span>{quizText(locale, "accuracy")}: {result.accuracyPercent.toFixed(1)}%</span>
        <span>{quizText(locale, "elapsed")}: {formatQuizTime(result.elapsedMs)}</span>
      </div>
      <p className="quiz__note">
        {result.finishReason === "timeout"
          ? quizText(locale, "timeUp")
          : locale === "ja"
            ? result.answered + "問終了しました。"
            : "All " + result.answered + " questions completed."}
      </p>
    </>
  );
}
