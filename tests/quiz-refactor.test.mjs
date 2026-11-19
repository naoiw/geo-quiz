import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const controller = read("src/features/quiz/useQuizSession.ts");
const timing = read("src/features/quiz/QuizRuleFields.tsx");
const engine = read("src/game-engine/engine.ts");
const textSource = read("src/i18n/quizMessages.ts");
const screens = [
  "NameQuiz.tsx", "NameToMapQuiz.tsx", "NameToFlagQuiz.tsx",
].map((file) => read("src/features/quiz/" + file));

test("one React controller owns the engine lifecycle and 250ms deadline ticking", () => {
  for (const token of ["startSession(", "submitAnswer(", "skipQuestion(",
    "advanceSession(", "tickSession(", "getRemainingMs(", "getQuestionCountry(", "getResult("]) {
    assert.ok(controller.includes(token), "missing shared engine adapter: " + token);
  }
  assert.ok(controller.includes("window.setInterval("));
  assert.ok(controller.includes("}, 250)"));
  assert.ok(controller.includes("window.clearInterval(interval)"));
  assert.ok(controller.includes('previous?.status === "asking"'));
  assert.ok(controller.includes('previous?.status === "review"'));
  assert.ok(controller.includes("setSession(null)"));
  assert.ok(controller.includes('...{ durationMs: durationSeconds * 1000 }') ||
    controller.includes('{ durationMs: durationSeconds * 1000 }'));
  assert.ok(!engine.includes('from "react"'), "pure engine gained a UI dependency");
});

test("every game screen delegates lifecycle and timing controls to shared code", () => {
  for (const screen of screens) {
    assert.ok(screen.includes("useQuizSession(locale)"));
    assert.ok(screen.includes("<QuizRuleFields"));
    assert.ok(screen.includes("startRound("));
    assert.ok(screen.includes("advanceRound()"));
    assert.ok(screen.includes("disabled={insufficientCountries}"));
    for (const old of ["startSession(", "submitAnswer(", "tickSession(",
      "getRemainingMs(", "getResult(", "window.setInterval("]) {
      assert.ok(!screen.includes(old), "duplicate lifecycle " + old);
    }
    assert.ok(!screen.includes("const durations ="));
  }
  for (const rule of ["ten-untimed", "ten-timed", "time-attack"]) {
    assert.ok(timing.includes(rule));
  }
  assert.ok(timing.includes("QUIZ_DURATIONS_SECONDS = [60, 120, 180, 300]"));
  assert.ok(timing.includes('locale === "ja"'));
});

test("mode-specific safeguards stay in the correct screen", () => {
  const [name, map, flag] = screens;
  for (const field of ["onCompositionStart=", "onCompositionEnd=", "suppressCompositionEnter.current",
    'type="submit"']) assert.ok(name.includes(field), "IME flow lost " + field);
  assert.ok(map.includes('selectedId'));
  assert.ok(map.includes('disabled={!selectedId}'));
  assert.ok(map.includes('submitRound({ format: "map", countryId: selectedId })'));
  assert.ok(map.includes('readOnly={session.status !== "asking"}'));
  assert.ok(flag.includes("createFlagChoices("));
  assert.ok(flag.includes('submitRound({ format: "flag", countryId })'));
  assert.ok(flag.includes('onClick={reset}'));
});

test("localized UI dictionary uses stable semantic keys without generated sentence names", () => {
  for (const key of ["scoringNote", "flagQuestion", "mapQuestion", "textAnswerHelp",
    "skippedCount", "mapSelectionNote", "mapReviewHelp", "mapSelectHelp",
    "flagSelectionNote", "mapHighlightHelp", "mapInteractionHelp"]) {
    assert.equal(textSource.split('"' + key + '"').length - 1, 2, "missing bilingual key " + key);
  }
  assert.ok(!textSource.includes("official_and_accepted_alternative_names_"));
  assert.ok(!textSource.includes("skippedNotice_2"));
});
