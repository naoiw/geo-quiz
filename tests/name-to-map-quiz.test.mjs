import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const world = JSON.parse(readFileSync("src/map/world-50m.json", "utf8"));
const regionIds = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];

const compiled = ts.transpileModule(readFileSync("src/game-engine/engine.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const engine = await import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));

function newSession(regionId = null, sessionRule = "ten-untimed", durationMs) {
  return engine.startSession(
    { quizKind: "name-to-map", answerFormat: "map", sessionRule, regionId },
    countries,
    { nowMs: 0, random: () => 0.37, ...(durationMs ? { durationMs } : {}) },
  );
}

test("all 197 countries are selectable map features, including the tiny countries", () => {
  const eligible = world.features.filter((feature) => feature.id !== null);
  assert.equal(eligible.length, 197);
  assert.equal(new Set(eligible.map((feature) => feature.id)).size, 197);
  const geometry = new Map(eligible.map((feature) => [feature.id, feature]));
  for (const country of countries) {
    const feature = geometry.get(country.id);
    assert.ok(feature, "Cannot select " + country.id);
    assert.ok(feature.d.startsWith("M"), "No shape for " + country.id);
    assert.ok(feature.center.length === 2);
  }
  for (const id of ["VA", "MC", "NR", "TV", "KI", "TO"]) {
    assert.equal(geometry.get(id).tiny, true, "Small country target: " + id);
  }
});

test("name-to-map playthrough works in Japanese and English", () => {
  for (const locale of ["ja", "en"]) {
    let session = newSession();
    const asked = new Set();
    for (let step = 0; step < 10; step++) {
      const country = engine.getQuestionCountry(session);
      assert.ok(country);
      assert.equal(session.currentQuestion.quizKind, "name-to-map");
      assert.equal(session.currentQuestion.answerFormat, "map");
      assert.ok(!asked.has(country.id));
      asked.add(country.id);
      session = engine.submitAnswer(session, { format: "map", countryId: country.id }, locale, step + 1);
      assert.equal(session.status, "review");
      assert.equal(session.lastReview.correctCountryId, country.id);
      assert.equal(session.lastReview.judgement, "correct");
      session = engine.advanceSession(session, step + 1, () => 0.37);
    }
    const result = engine.getResult(session);
    assert.equal(result.correct, 10);
    assert.equal(result.score, 1000);
    assert.equal(result.answered, 10);
    assert.equal(result.finishReason, "completed");
  }
});

test("region filtering keeps question IDs in the selected continent", () => {
  for (const regionId of regionIds) {
    const session = newSession(regionId);
    assert.equal(session.countryPool.length,
      countries.filter((country) => country.regionIds.includes(regionId)).length);
    assert.ok(session.countryPool.every((country) => country.regionIds.includes(regionId)));
    assert.ok(session.countryPool.some((country) => country.id === session.currentQuestion.countryId));
  }
});

test("wrong answer, skip and progress are scored by shared engine", () => {
  let session = newSession();
  const correctId = session.currentQuestion.countryId;
  const wrongId = countries.find((country) => country.id !== correctId).id;
  session = engine.submitAnswer(session, { format: "map", countryId: wrongId }, "ja", 1);
  assert.equal(session.lastReview.judgement, "incorrect");
  assert.equal(session.lastReview.answer.countryId, wrongId);
  assert.equal(session.lastReview.correctCountryId, correctId);
  assert.equal(session.score, 0);
  assert.throws(() => engine.submitAnswer(session, { format: "map", countryId: correctId }, "ja", 1), /awaiting/);
  session = engine.advanceSession(session, 2, () => 0.37);
  session = engine.skipQuestion(session, 3);
  assert.equal(session.lastReview.judgement, "skipped");
  assert.equal(session.lastReview.answer, null);
  session = engine.advanceSession(session, 4, () => 0.37);
  session = engine.submitAnswer(session, { format: "map", countryId: session.currentQuestion.countryId }, "ja", 5);
  assert.equal(session.score, 100);
});

test("timed and time-attack modes terminate without credit for late map picks", () => {
  for (const sessionRule of ["ten-timed", "time-attack"]) {
    let session = newSession(null, sessionRule, 1000);
    session = engine.submitAnswer(session,
      { format: "map", countryId: session.currentQuestion.countryId }, "en", 900);
    session = engine.advanceSession(session, 901, () => 0.37);
    session = engine.submitAnswer(session,
      { format: "map", countryId: session.currentQuestion.countryId }, "en", 1000);
    const result = engine.getResult(session);
    assert.equal(result.finishReason, "timeout");
    assert.equal(result.correct, 1);
    assert.equal(result.answered, 1);
    assert.equal(result.elapsedMs, 1000);
  }
});

test("map quiz only reveals the answer after confirmation, never on question start", () => {
  const quiz = readFileSync("src/features/quiz/NameToMapQuiz.tsx", "utf8");
  const app = readFileSync("src/app/App.tsx", "utf8");
  const card = readFileSync("src/components/ModeCard.tsx", "utf8");
  assert.ok(quiz.includes('quizKind: "name-to-map"'));
  assert.ok(quiz.includes('answerFormat: "map"'));
  assert.ok(quiz.includes("selectedId") && quiz.includes("onCountrySelect="));
  assert.ok(quiz.includes("disabled={!selectedId}"));
  assert.ok(quiz.includes('submitRound({ format: "map", countryId: selectedId })'));
  assert.ok(quiz.includes("skipRound()"));
  assert.ok(quiz.includes("advanceRound()") && quiz.includes("useQuizSession(locale)"));
  assert.ok(quiz.includes('focusCountryId={review?.correctCountryId ?? null}'));
  assert.ok(quiz.includes('highlightedCountryId={review?.correctCountryId ?? null}'));
  assert.ok(quiz.includes('readOnly={session.status !== "asking"}'));
  assert.ok(quiz.includes("showRegionNavigation"));
  assert.ok(app.includes("<NameToMapQuiz locale={locale} />"));
  assert.ok(card.includes('href={"#" + mode.id + "-quiz"}'));
});

test("region navigation and microstate touch targets remain separate from location pins", () => {
  const map = readFileSync("src/map/WorldMap.tsx", "utf8");
  const css = readFileSync("src/map/WorldMap.css", "utf8");
  for (const id of regionIds) {
    assert.ok(map.includes(id), "No map preset for " + id);
  }
  assert.ok(map.includes("const REGION_VIEWS"));
  assert.ok(map.includes("initialRegionId"));
  assert.ok(map.includes('showRegionNavigation && ('));
  assert.ok(map.includes("vectorEffect=\"non-scaling-stroke\""));
  assert.ok(css.includes("stroke: transparent"));
  assert.ok(css.includes("stroke-width: 18px"));
  assert.ok(css.includes(".world-map__country:focus-visible"));
  assert.ok(!map.includes("world-map__pin"));
});
