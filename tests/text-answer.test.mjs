import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const compiled = ts.transpileModule(readFileSync("src/game-engine/engine.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const engine = await import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));
const byId = new Map(countries.map((country) => [country.id, country]));

function judge(id, value, locale = "ja", kind = "map-to-name") {
  const country = byId.get(id);
  return engine.judgeAnswer(
    { countryId: id, number: 1, quizKind: kind, answerFormat: "text" },
    { format: "text", value }, country, locale,
  );
}

test("all 197 countries accept their display names and every explicitly registered alias/reading", () => {
  assert.equal(countries.length, 197);
  for (const country of countries) {
    for (const locale of ["ja", "en"]) {
      for (const value of [
        country.names[locale],
        ...country.aliases[locale],
        ...(country.readings?.[locale] ?? []),
      ]) {
        assert.equal(judge(country.id, value, locale), "correct", country.id + ": " + value);
        assert.equal(judge(country.id, value, locale, "flag-to-name"), "correct");
      }
    }
  }
});

test("registered normalized answers never belong to two different countries in either locale", () => {
  for (const locale of ["ja", "en"]) {
    const normalizedOwner = new Map();
    for (const country of countries) {
      const answers = engine.getAcceptedTextAnswers(country, locale);
      assert.equal(new Set(answers).size, answers.length);
      for (const normalized of answers) {
        const owner = normalizedOwner.get(normalized);
        assert.ok(!owner || owner === country.id,
          "Ambiguous " + locale + " answer: " + normalized + " (" + owner + ", " + country.id + ")");
        normalizedOwner.set(normalized, country.id);
      }
    }
  }
});

test("every Japanese country display name containing kanji has an explicit phonetic reading", () => {
  const kanjiCountries = countries.filter((country) => /[一-龯々]/u.test(country.names.ja));
  assert.equal(kanjiCountries.length, 23);
  for (const country of kanjiCountries) {
    assert.ok(country.readings?.ja?.length > 0, country.id + ": missing reading");
    for (const reading of country.readings.ja) {
      assert.ok(!/[一-龯々]/u.test(reading), country.id + ": reading contains kanji");
      assert.equal(judge(country.id, reading, "ja"), "correct", country.id);
    }
  }
});

test("hiragana, katakana, halfwidth and mixed-space input normalize without fuzzy matching", () => {
  const samples = [
    ["JP", "にほん", "ja"], ["JP", "ニッポン", "ja"], ["JP", "ﾆﾎﾝ", "ja"],
    ["JP", " 日本国 ", "ja"], ["CN", "ちゅうごく", "ja"],
    ["KR", "だいかんみんこく", "ja"], ["US", "ｱﾒﾘｶ", "ja"],
    ["US", "アメリカ合衆国", "ja"], ["CD", "こんごみんしゅきょうわこく", "ja"],
    ["CG", "こんごきょうわこく", "ja"],
    ["MM", "みゃんまー（びるま）", "ja"], ["MM", "ミャンマー", "ja"],
    ["VA", "ばちかんしこく", "ja"], ["TR", "とるこきょうわこく", "ja"],
    ["US", "ＵＳＡ", "en"], ["US", "united  states", "en"],
    ["CD", "DR Congo", "en"], ["CG", "Republic of the Congo", "en"],
    ["CI", "côte d'ivoire", "en"], ["MM", "Myanmar(Burma)", "en"],
    ["TR", "TÜRKİYE", "en"],
  ];
  for (const [id, value, locale] of samples) {
    assert.equal(judge(id, value, locale), "correct", id + ": " + value);
  }
});

test("shortened unknown forms, wrong countries, other-language text and empty answers remain incorrect", () => {
  const misses = [
    ["JP", "にほ", "ja"], ["JP", "japan", "ja"],
    ["US", "米", "ja"], ["US", "america", "en"],
    ["CD", "コンゴ", "ja"], ["CG", "コンゴ民主共和国", "ja"],
    ["CD", "こんごきょうわこく", "ja"], ["CG", "こんごみんしゅきょうわこく", "ja"],
    ["KR", "北朝鮮", "ja"], ["KP", "韓国", "ja"],
    ["DO", "ドミニカ国", "ja"], ["DM", "ドミニカ共和国", "ja"],
    ["JP", "にほんん", "ja"], ["JP", "  ", "ja"],
    ["CI", "cote divoire", "en"],
  ];
  for (const [id, value, locale] of misses) {
    assert.equal(judge(id, value, locale), "incorrect", id + ": " + value);
  }
});

test("switching language affects accepted name sets while ID-based choices are unchanged", () => {
  const jp = byId.get("JP");
  const question = { countryId: "JP", number: 1, quizKind: "map-to-name", answerFormat: "text" };
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "にほん" }, jp, "ja"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "にほん" }, jp, "en"), "incorrect");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "Japan" }, jp, "en"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "Japan" }, jp, "ja"), "incorrect");
  for (const format of ["multiple-choice", "map", "flag"]) {
    assert.equal(engine.judgeAnswer({ ...question, answerFormat: format },
      { format, countryId: "JP" }, jp, "ja"), "correct");
  }
});

test("two playable text-answer quizzes expose composition-aware mobile input, separate submit and help", () => {
  const screen = readFileSync("src/features/quiz/NameQuiz.tsx", "utf8");
  const map = readFileSync("src/features/quiz/MapToNameQuiz.tsx", "utf8");
  const flag = readFileSync("src/features/quiz/FlagToNameQuiz.tsx", "utf8");
  assert.ok(screen.includes("onCompositionStart="));
  assert.ok(screen.includes("onCompositionEnd="));
  assert.ok(screen.includes("suppressCompositionEnter.current"));
  assert.ok(screen.includes("event.nativeEvent.keyCode === 229"));
  assert.ok(screen.includes("onKeyUp="));
  assert.ok(screen.includes('enterKeyHint="done"'));
  assert.ok(screen.includes('aria-describedby={kind + "-answer-help"}'));
  assert.ok(screen.includes('type="submit"'));
  assert.ok(screen.includes("answerWithText()"));
  assert.ok(map.includes('kind="map-to-name"'));
  assert.ok(flag.includes('kind="flag-to-name"'));
});
