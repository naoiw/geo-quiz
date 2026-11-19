import { useEffect, useState } from "react";
import { countries } from "../../country-data";
import {
  advanceSession, getQuestionCountry, getRemainingMs, getResult,
  skipQuestion, startSession, submitAnswer, tickSession,
} from "../../game-engine/engine";
import type { Answer, GameConfiguration, GameSession } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";

/**
 * React adapter for the pure game engine, shared across every quiz screen.
 * Owns the clock and the asking → review → next/finished lifecycle only.
 * Mode-specific draft answers (text, map selection, flag choices) remain in each view.
 */
export function useQuizSession(locale: Locale) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [clockMs, setClockMs] = useState(0);

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
  const questionCountry = session ? getQuestionCountry(session) : null;
  const review = session?.status === "review" ? session.lastReview : null;
  const result = session?.status === "finished" ? getResult(session) : null;

  const startRound = (configuration: GameConfiguration, durationSeconds: number) => {
    const now = Date.now();
    setSession(startSession(configuration, countries, {
      nowMs: now,
      ...(configuration.sessionRule === "ten-untimed"
        ? {} : { durationMs: durationSeconds * 1000 }),
    }));
    setClockMs(now);
  };

  const submit = (answer: Answer) => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? submitAnswer(previous, answer, locale, now)
      : previous);
  };

  const skip = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "asking"
      ? skipQuestion(previous, now)
      : previous);
  };

  const advance = () => {
    const now = Date.now();
    setClockMs(now);
    setSession((previous) => previous?.status === "review"
      ? advanceSession(previous, now)
      : previous);
  };

  const reset = () => {
    setSession(null);
    setClockMs(0);
  };

  return {
    session, questionCountry, review, result, remainingMs,
    startRound, submit, skip, advance, reset,
  };
}
