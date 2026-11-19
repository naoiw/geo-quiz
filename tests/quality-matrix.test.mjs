import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const world = JSON.parse(readFileSync("src/map/world-50m.json", "utf8"));
const regions = [null, "africa", "asia", "europe", "north-america", "south-america", "oceania"];
const variants = [
  ["map-to-name", "text"], ["map-to-name", "multiple-choice"],
  ["flag-to-name", "text"], ["flag-to-name", "multiple-choice"],
  ["name-to-map", "map"], ["name-to-flag", "flag"],
];
const rules = ["ten-untimed", "ten-timed", "time-attack"];
const random = () => 0.31;

async function load(path) {
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));
}

const engine = await load("src/game-engine/engine.ts");
const nameChoices = await load("src/features/quiz/name-choices.ts");
const flagChoices = await load("src/features/quiz/flag-choices.ts");

test("every playable country resolves to exactly one 2D geometry and a bundled flag", () => {
  assert.equal(countries.length, 197);
  const featuresById = new Map();
  for (const feature of world.features) {
    if (feature.id === null) continue;
    assert.ok(!featuresById.has(feature.id), "Duplicate map feature " + feature.id);
    featuresById.set(feature.id, feature);
  }
  assert.equal(featuresById.size, countries.length);
  const ids = new Set();
  for (const country of countries) {
    assert.ok(!ids.has(country.id), "Duplicate country " + country.id);
    ids.add(country.id);
    assert.equal(country.geometryId, country.id);
    assert.equal(country.flagId, country.id);
    assert.ok(featuresById.has(country.geometryId), "Missing polygon " + country.id);
    assert.ok(existsSync("public/flags/" + country.flagId.toLowerCase() + ".svg"),
      "Missing bundled flag " + country.id);
    const feature = featuresById.get(country.geometryId);
    assert.ok(feature.d.startsWith("M") && feature.d.endsWith("Z"));
    assert.ok(feature.center.every(Number.isFinite), "Non-finite center " + country.id);
    assert.ok(feature.bounds.every(Number.isFinite), "Non-finite bounds " + country.id);
    assert.ok(country.names.ja.trim() && country.names.en.trim(), "Missing localized name " + country.id);
  }
  for (const id of ["VA", "MC", "NR", "TV", "KI", "TO", "PS", "XK", "TW", "SS"]) {
    assert.ok(ids.has(id) && featuresById.has(id), "Missing special case " + id);
  }
});

function candidateAnswer(session, locale, correct, wrong, step) {
  const format = session.configuration.answerFormat;
  if (format === "text") {
    return { format, value: wrong ? "not-a-country-99999" : correct.names[locale] };
  }
  if (format === "map") {
    return { format, countryId: wrong
      ? countries.find((item) => item.id !== correct.id).id : correct.id };
  }
  const useWorldwide = step % 2 === 1;
  if (format === "multiple-choice") {
    const options = nameChoices.createCountryNameChoices(
      correct.id, session.countryPool, locale, random,
      useWorldwide ? countries : session.countryPool,
    );
    assert.equal(options.length, 4);
    assert.equal(new Set(options.map((option) => option.countryId)).size, 4);
    assert.equal(options.filter((option) => option.countryId === correct.id).length, 1);
    if (!useWorldwide) {
      assert.ok(options.every((option) => session.countryPool.some((item) => item.id === option.countryId)));
    }
    return { format, countryId: wrong
      ? options.find((option) => option.countryId !== correct.id).countryId : correct.id };
  }
  const options = flagChoices.createFlagChoices(
    correct.id, session.countryPool, countries, { scope: useWorldwide ? "world" : "region", random },
  );
  assert.equal(options.length, 4);
  assert.equal(new Set(options.map((option) => option.flagId)).size, 4);
  assert.equal(options.filter((option) => option.id === correct.id).length, 1);
  if (!useWorldwide) {
    assert.ok(options.every((option) => session.countryPool.some((item) => item.id === option.id)));
  }
  return { format, countryId: wrong ? options.find((option) => option.id !== correct.id).id : correct.id };
}

test("all 252 locale × region × format × rule combinations grade and finish consistently", () => {
  let sessions = 0;
  for (const regionId of regions) {
    for (const locale of ["ja", "en"]) {
      for (const [quizKind, answerFormat] of variants) {
        for (const sessionRule of rules) {
          const timed = sessionRule !== "ten-untimed";
          let session = engine.startSession({
            quizKind, answerFormat, sessionRule, regionId,
          }, countries, {
            nowMs: 100, random, ...(timed ? { durationMs: 50000 } : {}),
          });
          const expectedPool = engine.getEligibleCountries(countries, regionId);
          assert.equal(session.countryPool.length, expectedPool.length);
          const seen = new Set();
          const questions = sessionRule === "time-attack" ? 12 : 10;
          let correctCount = 0, incorrectCount = 0, skippedCount = 0;
          for (let step = 0; step < questions; step++) {
            assert.equal(session.status, "asking");
            const correct = engine.getQuestionCountry(session);
            assert.ok(correct);
            assert.ok(expectedPool.some((item) => item.id === correct.id));
            assert.equal(session.currentQuestion.number, step + 1);
            assert.ok(!seen.has(correct.id), "Duplicate question before pool exhaustion");
            seen.add(correct.id);
            const nowMs = 101 + step;
            const outcome = step % 3;
            if (outcome === 2) {
              session = engine.skipQuestion(session, nowMs);
              skippedCount++;
              assert.equal(session.lastReview.judgement, "skipped");
            } else {
              const answer = candidateAnswer(session, locale, correct, outcome === 1, step);
              session = engine.submitAnswer(session, answer, locale, nowMs);
              assert.equal(session.lastReview.judgement, outcome === 0 ? "correct" : "incorrect");
              if (outcome === 0) correctCount++;
              else incorrectCount++;
            }
            assert.equal(session.status, "review");
            session = engine.advanceSession(session, nowMs, random);
          }
          if (sessionRule === "time-attack") {
            assert.equal(session.status, "asking");
            session = engine.tickSession(session, 50100);
          } else {
            assert.equal(session.status, "finished");
          }
          const result = engine.getResult(session);
          assert.equal(result.answered, questions);
          assert.equal(result.correct, correctCount);
          assert.equal(result.incorrect, incorrectCount);
          assert.equal(result.skipped, skippedCount);
          assert.equal(result.score, correctCount * 100);
          assert.equal(result.history.length, questions);
          assert.equal(result.finishReason, sessionRule === "time-attack" ? "timeout" : "completed");
          sessions++;
        }
      }
    }
  }
  assert.equal(sessions, 7 * 2 * 6 * 3);
});

test("map answers never receive the correct country as a pre-submit visual hint", () => {
  const source = readFileSync("src/features/quiz/NameToMapQuiz.tsx", "utf8");
  assert.ok(source.includes('mode={review ? "highlight" : "answer"}'));
  assert.ok(source.includes("highlightedCountryId={review?.correctCountryId ?? null}"));
  assert.ok(source.includes("focusCountryId={review?.correctCountryId ?? null}"));
  assert.ok(source.includes('onCountrySelect={session.status === "asking" ? setSelectedId : undefined}'));
  assert.ok(source.includes('disabled={!selectedId}'));
});
