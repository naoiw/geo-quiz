import { useMemo, useState } from "react";
import { countries, findCountry, getCountryName } from "../../country-data";
import { QuizRuleFields } from "./QuizRuleFields";
import { useQuizSession } from "./useQuizSession";
import type { SessionRule } from "../../game-engine/types";
import { CountryFlag } from "../../flags/CountryFlag";
import type { Locale } from "../../i18n/messages";
import { quizText, type QuizTextKey } from "../../i18n/quizMessages";
import { QuizFeedback, QuizProgress, QuizResultSummary } from "./QuizStatus";
import { CountryChoiceGrid } from "./CountryChoiceGrid";
import { RegionSelector, countRegionCountries, type RegionSelection } from "./RegionSelector";
import { createFlagChoices, type FlagChoiceScope } from "./flag-choices";
import "./NameQuiz.css";
import "./NameToFlagQuiz.css";

/** The fourth game mode: country name -> one of four locally bundled flags. */
export function NameToFlagQuiz({ locale }: { locale: Locale }) {
  const qt = (key: QuizTextKey) => quizText(locale, key);
  const [regionId, setRegionId] = useState<RegionSelection>("world");
  const [scope, setScope] = useState<FlagChoiceScope>("region");
  const [sessionRule, setSessionRule] = useState<SessionRule>("ten-untimed");
  const [durationSeconds, setDurationSeconds] = useState(120);
  const insufficientCountries = countRegionCountries(regionId) < (scope === "region" ? 4 : 1);
  const {
    session, questionCountry, review, result, remainingMs,
    startRound, submit: submitRound, skip: skipRound, advance: advanceRound, reset,
  } = useQuizSession(locale);
  const question = session?.currentQuestion;
  const selectedId = review?.answer?.format === "flag" ? review.answer.countryId : null;

  // The candidate set is stable throughout a question and its review, including
  // when the timer ticks. Only the question number/ID or fixed game pool changes it.
  const options = useMemo(() => {
    if (!question || !session) return [];
    return createFlagChoices(question.countryId, session.countryPool, countries, { scope })
      .map((country) => ({ countryId: country.id, country }));
  }, [question?.number, question?.countryId, session?.countryPool, scope]);

  const start = () => {
    if (insufficientCountries) return;
    startRound({
      quizKind: "name-to-flag",
      answerFormat: "flag",
      sessionRule,
      regionId: regionId === "world" ? null : regionId,
    }, durationSeconds);
  };

  const answer = (countryId: string) => submitRound({ format: "flag", countryId });
  const skip = () => skipRound();
  const next = () => advanceRound();

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
            <QuizRuleFields
              locale={locale}
              sessionRule={sessionRule}
              onSessionRuleChange={setSessionRule}
              durationSeconds={durationSeconds}
              onDurationChange={setDurationSeconds}
            />
          </div>
          <p className="quiz__note">{qt("flagSelectionNote")}</p>
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
            remainingMs={remainingMs}
            reviewed={session.status === "review"}
          />
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
            <QuizFeedback
              locale={locale}
              judgement={review.judgement}
              correctName={questionCountry ? getCountryName(questionCountry, locale) : review.correctCountryId}
              onContinue={next}
              details={review.judgement === "incorrect" && selectedId ? (
                <span className="quiz__flag-your-answer">
                  {qt("yourFlag")}
                  {findCountry(selectedId) ? getCountryName(findCountry(selectedId)!, locale) : selectedId}
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
          <button type="button" className="quiz__primary" onClick={reset}>
            {qt("playAgain")}
          </button>
        </div>
      )}
    </section>
  );
}
