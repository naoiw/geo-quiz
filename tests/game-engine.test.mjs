import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the production TypeScript engine without bundling it or adding a runtime test dependency.
const source = readFileSync("src/game-engine/engine.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const engine = await import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));
const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));

const variants = [
  ["map-to-name", "text"],
  ["map-to-name", "multiple-choice"],
  ["flag-to-name", "text"],
  ["flag-to-name", "multiple-choice"],
  ["name-to-map", "map"],
  ["name-to-flag", "flag"],
];

const config = (kind = "name-to-map", format = "map", rule = "ten-untimed", region = null) => ({
  quizKind: kind, answerFormat: format, sessionRule: rule, regionId: region,
});

function correctAnswer(session, locale = "ja") {
  const country = engine.getQuestionCountry(session);
  const format = session.currentQuestion.answerFormat;
  return format === "text"
    ? { format, value: country.names[locale] }
    : { format, countryId: country.id };
}

test("all six quiz/answer combinations use the same session and 10-question results", () => {
  for (const [kind, format] of variants) {
    let session = engine.startSession(config(kind, format), countries, { nowMs: 0, random: () => 0.3 });
    const seen = new Set();
    for (let i = 0; i < 10; i++) {
      assert.equal(session.status, "asking");
      assert.equal(session.currentQuestion.number, i + 1);
      assert.equal(session.currentQuestion.quizKind, kind);
      assert.equal(session.currentQuestion.answerFormat, format);
      assert.ok(!seen.has(session.currentQuestion.countryId));
      seen.add(session.currentQuestion.countryId);
      const before = session;
      session = engine.submitAnswer(session, correctAnswer(session), "ja", i + 1);
      assert.equal(before.history.length, i, "Session transitions must not mutate the prior state");
      assert.equal(session.lastReview.judgement, "correct");
      assert.equal(session.status, "review");
      assert.throws(() => engine.submitAnswer(session, correctAnswer(session), "ja", i + 1), /awaiting/);
      session = engine.advanceSession(session, i + 1, () => 0.3);
    }
    assert.equal(session.status, "finished");
    const result = engine.getResult(session);
    assert.deepEqual([result.answered, result.correct, result.incorrect, result.skipped], [10, 10, 0, 0]);
    assert.equal(result.finishReason, "completed");
    assert.equal(result.score, 1000);
    assert.equal(result.accuracyPercent, 100);
    assert.equal(result.history.length, 10);
  }
});

test("formats, scoring, skipped questions and results are validated independently of UI", () => {
  assert.deepEqual(engine.getAnswerFormats("map-to-name"), ["text", "multiple-choice"]);
  assert.deepEqual(engine.getAnswerFormats("name-to-flag"), ["flag"]);
  assert.throws(() => engine.startSession(config("name-to-flag", "text"), countries, { nowMs: 0 }), /Unsupported/);
  assert.throws(() => engine.startSession(config(), countries.slice(0, 9), { nowMs: 0 }), /Not enough/);
  assert.throws(() => engine.startSession(config(), [countries[0], countries[0], ...countries.slice(1)], { nowMs: 0 }), /Duplicate/);
  assert.throws(() => engine.startSession(config(), countries, { nowMs: 0, random: () => 1 }), /Random/);
  assert.throws(() => engine.startSession(config(), countries, { nowMs: 0, scoring: { correct: 0.5, incorrect: 0, skipped: 0 } }), /Invalid scoring/);

  const policy = { correct: 7, incorrect: -3, skipped: -1 };
  const start = engine.startSession(config(), countries, { nowMs: 100, scoring: policy, random: () => 0 });
  policy.correct = 99;
  assert.equal(start.scoring.correct, 7, "Policy is copied when the session begins");
  assert.throws(() => engine.getResult(start), /only available/);
  assert.throws(() => engine.advanceSession(start, 101), /only valid/);
  assert.throws(() => engine.submitAnswer(start, { format: "text", value: "Japan" }, "en", 101), /format/);
  let session = engine.submitAnswer(start, { format: "map", countryId: "NOT_A_COUNTRY" }, "ja", 101);
  assert.deepEqual([session.score, session.lastReview.judgement], [-3, "incorrect"]);
  session = engine.advanceSession(session, 101, () => 0);
  session = engine.skipQuestion(session, 102);
  assert.deepEqual([session.score, session.lastReview.judgement], [-4, "skipped"]);
  session = engine.advanceSession(session, 102, () => 0);
  session = engine.submitAnswer(session, correctAnswer(session), "ja", 103);
  assert.equal(session.score, 3);
  session = engine.advanceSession(session, 103, () => 0);
  for (let i = 3; i < 10; i++) {
    session = engine.submitAnswer(session, correctAnswer(session), "ja", 104 + i);
    session = engine.advanceSession(session, 104 + i, () => 0);
  }
  const result = engine.getResult(session);
  assert.deepEqual([result.correct, result.incorrect, result.skipped], [8, 1, 1]);
  assert.equal(result.score, 8 * 7 - 3 - 1);
  assert.equal(result.accuracyPercent, 100 * 8 / 9);
});

test("regional filtering and localized text answers use the same country pool", () => {
  const asia = engine.getEligibleCountries(countries, "asia");
  assert.equal(asia.length, 48);
  assert.ok(asia.every((c) => c.regionIds.includes("asia")));
  const session = engine.startSession(config("flag-to-name", "text", "ten-untimed", "asia"), countries, { nowMs: 0, random: () => 0.5 });
  assert.equal(session.eligibleCountryIds.length, 48);
  assert.ok(asia.some((c) => c.id === session.currentQuestion.countryId));

  const japan = countries.find((c) => c.id === "JP");
  const question = { number: 1, countryId: "JP", quizKind: "flag-to-name", answerFormat: "text" };
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "ＪＡＰＡＮ " }, japan, "en"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "日本" }, japan, "ja"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "日本国" }, japan, "ja"), "incorrect");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: " " }, japan, "ja"), "incorrect");
  const us = countries.find((c) => c.id === "US");
  assert.equal(engine.judgeAnswer({ ...question, countryId: "US" }, { format: "text", value: "アメリカ" }, us, "ja"), "correct");
});

test("ten-timed expires at the exact deadline and prevents late scoring", () => {
  assert.throws(() => engine.startSession(config("name-to-map", "map", "ten-timed"), countries, { nowMs: 1000 }), /durationMs/);
  assert.throws(() => engine.startSession(config(), countries, { nowMs: 1000, durationMs: 500 }), /Untimed/);
  let session = engine.startSession(config("name-to-map", "map", "ten-timed"), countries, {
    nowMs: 1000, durationMs: 500, random: () => 0,
  });
  assert.equal(engine.getRemainingMs(session, 1100), 400);
  session = engine.submitAnswer(session, correctAnswer(session), "ja", 1499);
  assert.equal(session.score, 100);
  session = engine.advanceSession(session, 1499);
  session = engine.submitAnswer(session, correctAnswer(session), "ja", 1500);
  assert.equal(session.status, "finished");
  const result = engine.getResult(session);
  assert.equal(result.finishReason, "timeout");
  assert.equal(result.answered, 1);
  assert.equal(result.score, 100);
  assert.equal(result.elapsedMs, 500);
  assert.equal(engine.getRemainingMs(session, 1600), 0);
});

test("time-attack reuses the pool only after exhausting every country", () => {
  const pool = countries.slice(0, 3);
  let session = engine.startSession(config("name-to-flag", "flag", "time-attack"), pool, {
    nowMs: 0, durationMs: 1000, random: () => 0,
  });
  const ids = [];
  for (let i = 0; i < 7; i++) {
    ids.push(session.currentQuestion.countryId);
    session = engine.submitAnswer(session, correctAnswer(session), "en", i + 1);
    session = engine.advanceSession(session, i + 1, () => 0);
  }
  assert.equal(new Set(ids.slice(0, 3)).size, 3);
  assert.equal(new Set(ids.slice(3, 6)).size, 3);
  assert.notEqual(ids[2], ids[3], "No immediate repeat across two decks");
  assert.notEqual(ids[5], ids[6], "No immediate repeat on the next deck");
  assert.equal(session.currentQuestion.number, 8);
  session = engine.tickSession(session, 1000);
  const result = engine.getResult(session);
  assert.equal(result.finishReason, "timeout");
  assert.equal(result.answered, 7);
  assert.equal(result.correct, 7);
  assert.equal(result.score, 700);
});

test("deterministic random injection and invalid times", () => {
  const a = engine.startSession(config(), countries, { nowMs: 10, random: () => 0.25 });
  const b = engine.startSession(config(), countries, { nowMs: 10, random: () => 0.25 });
  assert.deepEqual(a.currentQuestion, b.currentQuestion);
  assert.deepEqual(a.remainingCountryIds, b.remainingCountryIds);
  assert.throws(() => engine.tickSession(a, 9), /precede/);
  assert.throws(() => engine.startSession(config(), countries, { nowMs: Number.NaN }), /finite/);
  assert.throws(() => engine.getRemainingMs(a, Number.POSITIVE_INFINITY), /finite/);
});
