import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

// Exercise the same pure TypeScript helper used by the interactive map quiz.
const source = readFileSync("src/features/quiz/name-choices.ts", "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { createCountryNameChoices } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64")
);
const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const world = JSON.parse(readFileSync("src/map/world-50m.json", "utf8"));

function validateChoices(correctCountryId, pool, locale, random = () => 0.37) {
  const options = createCountryNameChoices(correctCountryId, pool, locale, random);
  assert.equal(options.length, 4);
  assert.equal(new Set(options.map((option) => option.countryId)).size, 4);
  assert.equal(new Set(options.map((option) => option.label)).size, 4);
  assert.equal(options.filter((option) => option.countryId === correctCountryId).length, 1);
  assert.ok(options.every((option) => pool.some(
    (country) => country.id === option.countryId && country.names[locale] === option.label,
  )));
  return options;
}

test("all 197 countries produce four distinct local-language answers", () => {
  for (const locale of ["ja", "en"]) {
    for (const country of countries) {
      validateChoices(country.id, countries, locale);
    }
  }
});

test("region-local choices work in all six world regions", () => {
  const regions = ["africa", "asia", "europe", "north-america", "south-america", "oceania"];
  for (const regionId of regions) {
    const pool = countries.filter((country) => country.regionIds.includes(regionId));
    assert.ok(pool.length >= 4);
    for (const locale of ["ja", "en"]) {
      for (const country of pool) validateChoices(country.id, pool, locale);
    }
  }
});

test("choice generation is repeatable with injected random and rejects invalid pools", () => {
  const first = validateChoices("JP", countries, "ja", () => 0.2);
  const second = validateChoices("JP", countries, "ja", () => 0.2);
  assert.deepEqual(first, second);
  assert.throws(() => createCountryNameChoices("ZZ", countries, "ja"), /missing/);
  assert.throws(() => createCountryNameChoices("JP", countries.slice(0, 3), "ja"), /missing|four/);
  assert.throws(() => createCountryNameChoices("JP", countries, "ja", () => 1), /Random/);
});

test("countries with the same localized name are not displayed twice", () => {
  const fixture = [
    { id: "AA", names: { ja: "同名", en: "Same" } },
    { id: "BB", names: { ja: "別名", en: "Other" } },
    { id: "CC", names: { ja: "別名", en: "Other" } },
    { id: "DD", names: { ja: "第三", en: "Third" } },
    { id: "EE", names: { ja: "第四", en: "Fourth" } },
  ];
  for (const locale of ["ja", "en"]) validateChoices("AA", fixture, locale);
});

test("every tiny island and microstate remains in the playable world map", () => {
  const ids = new Set(world.features.map((feature) => feature.id));
  for (const country of countries) assert.ok(ids.has(country.id), country.id);
  for (const id of ["VA", "MC", "NR", "TV", "KI", "TO"]) {
    const feature = world.features.find((country) => country.id === id);
    assert.equal(feature.tiny, true, id);
    assert.ok(feature.d.startsWith("M"), id);
  }
});

test("quiz map hides country labels and adds no marker overlay", () => {
  const map = readFileSync("src/map/WorldMap.tsx", "utf8");
  const styles = readFileSync("src/map/WorldMap.css", "utf8");
  const quiz = readFileSync("src/features/quiz/MapToNameQuiz.tsx", "utf8");
  assert.match(map, /readOnly = false/);
  assert.match(map, /aria-label=\\{!readOnly \\? country\\?\\.names\\[locale\\] : undefined\\}/);
  assert.match(map, /!readOnly && <g className="world-map__microstate-hit-areas"/);
  assert.match(styles, /world-map--quiz \\.world-map__country--highlighted\\[data-tiny="true"\\]/);
  assert.match(quiz, /<WorldMap[\\s\\S]*?readOnly/);
  assert.match(quiz, /submitAnswer\\(/);
  assert.match(quiz, /getResult\\(/);
});
