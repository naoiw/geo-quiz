import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const source = readFileSync("src/features/quiz/name-choices.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createCountryNameChoices } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64")
);
const regions = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];
const random = () => 0.31;

test("regional and worldwide distractors keep the correct country in the selected region", () => {
  for (const region of regions) {
    const pool = countries.filter((country) => country.regionIds.includes(region));
    for (const locale of ["ja", "en"]) {
      for (const correct of pool) {
        for (const sourcePool of [pool, countries]) {
          const options = createCountryNameChoices(correct.id, pool, locale, random, sourcePool);
          assert.equal(options.length, 4);
          assert.equal(options.filter((c) => c.countryId === correct.id).length, 1);
          assert.equal(new Set(options.map((c) => c.countryId)).size, 4);
          assert.equal(new Set(options.map((c) => c.label.normalize("NFKC").toLowerCase())).size, 4);
          for (const option of options) {
            const country = sourcePool.find((c) => c.id === option.countryId);
            assert.ok(country);
            assert.equal(option.label, country.names[locale]);
          }
          if (sourcePool === pool) {
            assert.ok(options.every((c) => pool.some((item) => item.id === c.countryId)));
          }
          assert.deepEqual(options, createCountryNameChoices(correct.id, pool, locale, random, sourcePool));
        }
      }
    }
  }
});

test("worldwide scope supplies distractors even for a single eligible question country", () => {
  const jp = countries.find((country) => country.id === "JP");
  const options = createCountryNameChoices("JP", [jp], "en", random, countries);
  assert.equal(options.length, 4);
  assert.equal(options.filter((c) => c.countryId === "JP").length, 1);
  assert.throws(() => createCountryNameChoices("JP", [jp], "en", random), /four/);
  assert.throws(() => createCountryNameChoices("JP", [jp], "en", () => 1, countries), /Random/);
});

test("duplicated IDs and localized case or compatibility variants cannot duplicate options", () => {
  const fixture = [
    { id: "AA", names: { ja: "日本", en: "Same" } },
    { id: "AA", names: { ja: "日本", en: "Same" } },
    { id: "BB", names: { ja: "ﾆﾎﾝ", en: "same" } },
    { id: "CC", names: { ja: "第三", en: "Third" } },
    { id: "DD", names: { ja: "第四", en: "Fourth" } },
    { id: "EE", names: { ja: "第五", en: "Fifth" } },
  ];
  for (const locale of ["ja", "en"]) {
    const options = createCountryNameChoices("AA", fixture, locale, random);
    assert.equal(options.length, 4);
    assert.equal(new Set(options.map((c) => c.countryId)).size, 4);
  }
});

test("name-choice scope setting is only visible for multiple-choice and is bilingual", () => {
  const screen = readFileSync("src/features/quiz/NameQuiz.tsx", "utf8");
  const messages = readFileSync("src/i18n/quizMessages.ts", "utf8");
  assert.ok(screen.includes('answerFormat === "multiple-choice" && ('));
  assert.ok(screen.includes('value={nameChoiceScope}'));
  assert.ok(screen.includes('nameChoiceScope === "region" ? session.countryPool : countries'));
  assert.ok(screen.includes('qt("nameDistractorScope")'));
  assert.ok(messages.includes('"nameDistractorScope": "誤答国名の範囲"'));
  assert.ok(messages.includes('"nameDistractorScope": "Other country choices"'));
});
