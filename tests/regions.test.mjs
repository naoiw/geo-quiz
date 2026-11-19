import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const allRegions = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];
const variants = [
  ["map-to-name", "text"], ["map-to-name", "multiple-choice"],
  ["flag-to-name", "text"], ["flag-to-name", "multiple-choice"],
  ["name-to-map", "map"], ["name-to-flag", "flag"],
];

async function compiled(path) {
  const source = readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," + Buffer.from(output.outputText).toString("base64"));
}

const engine = await compiled("src/game-engine/engine.ts");
const nameChoices = await compiled("src/features/quiz/name-choices.ts");
const flagChoices = await compiled("src/features/quiz/flag-choices.ts");
const random = () => 0.23;
function config(kind, format, regionId, sessionRule = "ten-untimed") {
  return { quizKind: kind, answerFormat: format, sessionRule, regionId };
}

test("every country is included once in world, and transcontinental memberships are explicit", () => {
  assert.equal(countries.length, 197);
  assert.deepEqual(Object.fromEntries(allRegions.map((region) => [
    region, engine.getEligibleCountries(countries, region).length,
  ])), {
    africa: 54, asia: 49, europe: 48,
    "north-america": 23, "south-america": 12, oceania: 14,
  });
  assert.equal(countries.reduce((sum, country) => sum + country.regionIds.length, 0), 200);
  assert.equal(new Set(engine.getEligibleCountries(countries, null).map((c) => c.id)).size, 197);
  for (const id of ["RU", "TR", "KZ"]) {
    assert.ok(engine.getEligibleCountries(countries, "europe").some((c) => c.id === id), id);
    assert.ok(engine.getEligibleCountries(countries, "asia").some((c) => c.id === id), id);
  }
  assert.ok(!engine.getEligibleCountries(countries, "asia").some((c) => c.id === "FR"));
});

test("all six quiz/answer formats can play each region with no out-of-region questions", () => {
  for (const regionId of [null, ...allRegions]) {
    const pool = engine.getEligibleCountries(countries, regionId);
    for (const [kind, format] of variants) {
      const session = engine.startSession(config(kind, format, regionId), countries,
        { nowMs: 100, random });
      assert.equal(session.countryPool.length, pool.length);
      assert.equal(session.eligibleCountryIds.length, pool.length);
      assert.equal(new Set(session.eligibleCountryIds).size, pool.length);
      assert.equal(session.questionLimit, 10);
      assert.ok(pool.some((country) => country.id === session.currentQuestion.countryId));
      if (format === "multiple-choice") {
        const choices = nameChoices.createCountryNameChoices(
          session.currentQuestion.countryId, session.countryPool, "ja", random);
        assert.equal(choices.length, 4);
        assert.equal(new Set(choices.map((c) => c.countryId)).size, 4);
      }
      if (format === "flag") {
        const choices = flagChoices.createFlagChoices(
          session.currentQuestion.countryId, session.countryPool, countries,
          { scope: "region", random });
        assert.equal(choices.length, 4);
        assert.ok(choices.every((country) => country.regionIds.some((id) => id === regionId)
          || regionId === null));
      }
    }
  }
});

test("small 4-to-9 country future subregions shorten 10-question sessions, never repeat or hang", () => {
  for (const size of [4, 5, 8, 9]) {
    const fixture = countries.slice(0, size);
    for (const rule of ["ten-untimed", "ten-timed"]) {
      let session = engine.startSession(config("map-to-name", "multiple-choice", null, rule),
        fixture, { nowMs: 0, random, ...(rule === "ten-timed" ? { durationMs: 100000 } : {}) });
      assert.equal(session.questionLimit, size);
      const seen = new Set();
      for (let i = 0; i < size; i++) {
        const country = engine.getQuestionCountry(session);
        assert.ok(!seen.has(country.id));
        seen.add(country.id);
        session = engine.submitAnswer(session, {
          format: "multiple-choice", countryId: country.id,
        }, "en", i + 1);
        session = engine.advanceSession(session, i + 1, random);
      }
      assert.equal(session.status, "finished");
      assert.equal(engine.getResult(session).correct, size);
    }
  }
});

test("tiny pools 1 to 3 permit map/text answers but reject impossible name four-choice", () => {
  for (const size of [1, 2, 3]) {
    const fixture = countries.slice(0, size);
    for (const [kind, format] of [["map-to-name", "text"], ["name-to-map", "map"]]) {
      let session = engine.startSession(config(kind, format, null), fixture, { nowMs: 0, random });
      assert.equal(session.questionLimit, size);
      for (let i = 0; i < size; i++) {
        const c = engine.getQuestionCountry(session);
        const answer = format === "text"
          ? { format, value: c.names.ja }
          : { format, countryId: c.id };
        session = engine.submitAnswer(session, answer, "ja", i + 1);
        session = engine.advanceSession(session, i + 1, random);
      }
      assert.equal(engine.getResult(session).correct, size);
    }
    assert.throws(() => engine.startSession(
      config("flag-to-name", "multiple-choice", null), fixture, { nowMs: 0, random }),
    /at least four/);
  }
  assert.throws(() => engine.startSession(
    config("name-to-map", "map", null), [], { nowMs: 0 }),
  /no countries/);
  assert.equal(engine.getQuestionLimit(3, "ten-untimed"), 3);
  assert.equal(engine.getQuestionLimit(3, "ten-timed"), 3);
  assert.equal(engine.getQuestionLimit(3, "time-attack"), 0);
});

test("small timed rounds complete correctly and timeout retains correct accounting", () => {
  const fixture = countries.slice(0, 5);
  let done = engine.startSession(config("name-to-map", "map", null, "ten-timed"), fixture,
    { nowMs: 0, durationMs: 200, random });
  for (let i = 0; i < 5; i++) {
    const c = engine.getQuestionCountry(done);
    done = engine.submitAnswer(done, { format: "map", countryId: c.id }, "ja", i + 1);
    done = engine.advanceSession(done, i + 1, random);
  }
  assert.equal(engine.getResult(done).finishReason, "completed");
  let timed = engine.startSession(config("name-to-map", "map", null, "ten-timed"), fixture,
    { nowMs: 0, durationMs: 3, random });
  timed = engine.tickSession(timed, 3);
  assert.equal(engine.getResult(timed).finishReason, "timeout");
});

test("region selector and question counter are shared by every playable mode", () => {
  const selector = readFileSync("src/features/quiz/RegionSelector.tsx", "utf8");
  assert.ok(selector.includes("countRegionCountries"));
  assert.ok(selector.includes("getQuestionLimit"));
  assert.ok(selector.includes('value="world"'));
  assert.ok(selector.includes("regions.map"));
  for (const file of ["NameQuiz", "NameToMapQuiz", "NameToFlagQuiz"]) {
    const screen = readFileSync("src/features/quiz/" + file + ".tsx", "utf8");
    assert.ok(screen.includes("<RegionSelector"), file);
    assert.ok(screen.includes("insufficientCountries"), file);
    assert.ok(screen.includes("disabled={insufficientCountries}"), file);
    assert.ok(screen.includes("session.questionLimit"), file);
  }
  const map = readFileSync("src/map/WorldMap.tsx", "utf8");
  const mapScreen = readFileSync("src/features/quiz/NameToMapQuiz.tsx", "utf8");
  assert.ok(map.includes("const REGION_VIEWS"));
  assert.ok(mapScreen.includes("initialRegionId={session.configuration.regionId}"));
  assert.ok(mapScreen.includes('focusCountryId={review?.correctCountryId ?? null}'));
});
