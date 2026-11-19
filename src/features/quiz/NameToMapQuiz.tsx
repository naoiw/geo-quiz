import { useState } from "react";
import { findCountry, getCountryName } from "../../country-data";
import { QuizRuleFields } from "./QuizRuleFields";
import { useQuizSession } from "./useQuizSession";
import type { SessionRule } from "../../game-engine/types";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";
import { QuizFeedback, QuizProgress, QuizResultSummary } from "./QuizStatus";
import { WorldView } from "../../map/WorldView";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import "./NameQuiz.css";
import "./NameToMapQuiz.css";

/** 2D renderer only: question IDs and judgement remain in the shared game engine. */
export function NameToMapQuiz({ locale }: { locale: Locale }) {
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [durationSeconds, setDurationSeconds] = useState(120);
  const insufficientCountries = countRegionCountries(regionId) < 1;
  const {
    session, questionCountry, review, result, remainingMs,
    startRound, submit: submitRound, skip: skipRound, advance: advanceRound, reset,
  } = useQuizSession(locale);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reviewedChoiceId = review?.answer?.format === "map" ? review.answer.countryId : null;
  const mapSelectedId = review ? reviewedChoiceId : selectedId;
  const selectedCountry = selectedId ? findCountry(selectedId) : null;

  const start = () => {
    if (insufficientCountries) return;
    startRound({
      quizKind: "name-to-map",
      answerFormat: "map",
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    }, durationSeconds);
    setSelectedId(null);
  };

  const submit = () => {
    if (!selectedId || session?.status !== "asking") return;
    submitRound({ format: "map", countryId: selectedId });
  };

  const skip = () => {
    if (session?.status !== "asking") return;
    skipRound();
    setSelectedId(null);
  };

  const next = () => {
    advanceRound();
    setSelectedId(null);
  };

  const restart = () => {
    reset();
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
            <QuizRuleFields
              locale={locale}
              sessionRule={sessionRule}
              onSessionRuleChange={setSessionRule}
              durationSeconds={durationSeconds}
              onDurationChange={setDurationSeconds}
            />
          </div>
          <p className="quiz__note">{qt("mapSelectionNote")}</p>
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
            reviewed={session.status === "review"}
          />
          <p className="quiz__prompt">
            {qt("mapPromptStart")}<strong>
              {questionCountry ? getCountryName(questionCountry, locale) :
                session.currentQuestion?.countryId}
            </strong>{qt("mapPromptEnd")}
          </p>
          <p className="quiz__map-help">
            {review
              ? (qt("mapReviewHelp"))
              : (qt("mapSelectHelp"))}
          </p>

          <WorldView
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
