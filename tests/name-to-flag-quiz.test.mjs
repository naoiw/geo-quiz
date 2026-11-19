import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const regions = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];

async function loadTypeScript(path) {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));
}

const choices = await loadTypeScript("src/features/quiz/flag-choices.ts");
const engine = await loadTypeScript("src/game-engine/engine.ts");
const random = () => 0.27;

function assertChoices(target, questionPool, scope = "region") {
  const result = choices.createFlagChoices(target.id, questionPool, countries, { scope, random });
  assert.equal(result.length, 4);
  assert.equal(result.filter((country) => country.id === target.id).length, 1);
  assert.equal(new Set(result.map((country) => country.id)).size, 4);
  assert.equal(new Set(result.map((country) => country.flagId)).size, 4);
  assert.ok(result.every((country) => countries.some((item) => item.id === country.id)));
  if (scope === "region") {
    assert.ok(result.every((country) => questionPool.some((item) => item.id === country.id)));
  }
  return result;
}

test("197 bundled flags have distinct image data, not merely distinct logical names", () => {
  const hashes = new Set();
  const ids = new Set();
  for (const country of countries) {
    assert.equal(country.flagId, country.id);
    assert.ok(!ids.has(country.id));
    ids.add(country.id);
    const svg = readFileSync("public/flags/" + country.flagId.toLowerCase() + ".svg");
    const hash = createHash("sha256").update(svg).digest("hex");
    assert.ok(!hashes.has(hash), "Identical flag SVG content: " + country.id);
    hashes.add(hash);
  }
  assert.equal(hashes.size, 197);
});

test("all 197 correct countries have exactly four distinct flag candidates", () => {
  for (const country of countries) {
    assertChoices(country, countries, "region");
    assertChoices(country, countries, "world");
  }
});

test("all six regions support regional or worldwide distractor pools", () => {
  for (const regionId of regions) {
    const pool = countries.filter((country) => country.regionIds.includes(regionId));
    assert.ok(pool.length >= 10);
    for (const country of pool) {
      assertChoices(country, pool, "region");
      assertChoices(country, pool, "world");
    }
  }
});

test("choices are reproducible and distractor strategy can be replaced", () => {
  const jp = countries.find((country) => country.id === "JP");
  const jpScope = countries.filter((country) => country.regionIds.includes("asia"));
  const first = assertChoices(jp, jpScope);
  assert.deepEqual(first, assertChoices(jp, jpScope));
  const ranked = choices.createFlagChoices(jp.id, jpScope, countries, {
    scope: "region", random,
    rankDistractors: (available) => [...available].reverse(),
  });
  assert.equal(ranked.length, 4);
  assert.equal(new Set(ranked.map((country) => country.flagId)).size, 4);
  assert.throws(() => choices.createFlagChoices("??", jpScope, countries, { scope: "world" }),
    /missing from the question pool/);
  assert.throws(() => choices.createFlagChoices("JP", jpScope, countries, {
    scope: "region", random: () => 1,
  }), /Random source/);
  assert.throws(() => choices.createFlagChoices("JP", jpScope, countries, {
    scope: "region", random,
    rankDistractors: () => [],
  }), /ranking did not provide/);
  assert.throws(() => choices.createFlagChoices("JP", jpScope, countries, { scope: "bad" }),
    /Unknown flag choice scope/);
});

test("fewer than four distinct flags is rejected; worldwide scope can supply distractors", () => {
  const subset = [countries[0], countries[1], countries[2]];
  assert.throws(() => choices.createFlagChoices(subset[0].id, subset, countries, {
    scope: "region", random,
  }), /At least four distinct flags/);
  assertChoices(subset[0], subset, "world");

  const duplicateFlag = [
    { ...countries[0], flagId: "DUP" },
    { ...countries[1], flagId: "DUP" },
    { ...countries[2], flagId: "TWO" },
    { ...countries[3], flagId: "THREE" },
  ];
  assert.throws(() => choices.createFlagChoices(duplicateFlag[0].id, duplicateFlag, duplicateFlag, {
    scope: "region", random,
  }), /At least four distinct flags/);
});

test("ten-question flag game uses the same session, scoring and all answer locales", () => {
  for (const locale of ["ja", "en"]) {
    let session = engine.startSession({
      quizKind: "name-to-flag", answerFormat: "flag",
      sessionRule: "ten-untimed", regionId: "europe",
    }, countries, { nowMs: 0, random });
    const ids = new Set();
    for (let n = 0; n < 10; n++) {
      const country = engine.getQuestionCountry(session);
      assert.ok(country);
      assert.ok(!ids.has(country.id));
      ids.add(country.id);
      const candidate = assertChoices(country, session.countryPool, "region");
      const chosen = candidate.find((choice) => choice.id === country.id);
      session = engine.submitAnswer(session,
        { format: "flag", countryId: chosen.id }, locale, n + 1);
      assert.equal(session.lastReview.judgement, "correct");
      session = engine.advanceSession(session, n + 1, random);
    }
    assert.equal(session.status, "finished");
    const result = engine.getResult(session);
    assert.equal(result.answered, 10);
    assert.equal(result.correct, 10);
    assert.equal(result.score, 1000);
  }
});

test("incorrect flag choice, skip, and both timed rules follow the common engine", () => {
  for (const rule of ["ten-timed", "time-attack"]) {
    let session = engine.startSession({
      quizKind: "name-to-flag", answerFormat: "flag", sessionRule: rule, regionId: null,
    }, countries, { nowMs: 0, durationMs: 1000, random });
    const original = session.currentQuestion.countryId;
    const wrong = choices.createFlagChoices(original, session.countryPool, countries, {
      scope: "world", random,
    }).find((country) => country.id !== original);
    session = engine.submitAnswer(session, { format: "flag", countryId: wrong.id }, "ja", 1);
    assert.equal(session.lastReview.judgement, "incorrect");
    assert.equal(session.score, 0);
    session = engine.advanceSession(session, 2, random);
    session = engine.skipQuestion(session, 3);
    assert.equal(session.lastReview.judgement, "skipped");
    session = engine.advanceSession(session, 4, random);
    session = engine.submitAnswer(session,
      { format: "flag", countryId: session.currentQuestion.countryId }, "ja", 1000);
    const result = engine.getResult(session);
    assert.equal(result.finishReason, "timeout");
    assert.equal(result.answered, 2);
    assert.equal(result.correct, 0);
    assert.equal(result.incorrect, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.elapsedMs, 1000);
  }
});

test("UI wires flag choices, limits accidental name leaks and shares the choice grid", () => {
  const page = readFileSync("src/features/quiz/NameToFlagQuiz.tsx", "utf8");
  const grid = readFileSync("src/features/quiz/CountryChoiceGrid.tsx", "utf8");
  const names = readFileSync("src/features/quiz/NameQuiz.tsx", "utf8");
  const styles = readFileSync("src/features/quiz/NameToFlagQuiz.css", "utf8");
  const app = readFileSync("src/app/App.tsx", "utf8");
  assert.ok(page.includes('quizKind: "name-to-flag"'));
  assert.ok(page.includes('answerFormat: "flag"'));
  assert.ok(page.includes('format: "flag", countryId'));
  assert.ok(page.includes("createFlagChoices("));
  assert.ok(page.includes("useQuizSession(locale)") && page.includes("startRound("));
  assert.ok(page.includes("<CountryChoiceGrid"));
  assert.ok(names.includes("<CountryChoiceGrid"));
  assert.ok(grid.includes("onSelect(choice.countryId)"));
  assert.ok(page.includes('String.fromCharCode(65 + index)'));
  assert.ok(styles.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(styles.includes("object-fit: contain"));
  assert.ok(app.includes("<NameToFlagQuiz locale={locale} />"));
});
