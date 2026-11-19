import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function importPure(path) {
  const result = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," + Buffer.from(result.outputText).toString("base64"));
}

const locales = await importPure("src/i18n/locale.ts");
const quiz = await importPure("src/i18n/quizMessages.ts");
const ui = await importPure("src/i18n/messages.ts");
const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));

test("language detection honors user choice, browser language priority and fallback", () => {
  assert.equal(locales.resolveLocale("ja", ["en-US"]), "ja");
  assert.equal(locales.resolveLocale("en", ["ja-JP"]), "en");
  assert.equal(locales.resolveLocale("ja-JP", ["en-US"]), "ja");
  assert.equal(locales.resolveLocale(null, ["fr-FR", "en-US", "ja-JP"]), "en");
  assert.equal(locales.resolveLocale(null, ["fr-FR", "ja-JP", "en-US"]), "ja");
  assert.equal(locales.resolveLocale(null, ["zh-CN", "ko-KR"]), "en");
  assert.equal(locales.resolveLocale("es", ["ja-JP"]), "ja");
  assert.equal(locales.resolveLocale(null, []), "en");
  assert.equal(locales.parseLocale("JA_jp"), "ja");
  assert.equal(locales.parseLocale("en-GB"), "en");
  assert.equal(locales.parseLocale("french"), null);
  assert.equal(locales.LOCALE_STORAGE_KEY, "geo-quiz:locale");
});

test("all home and quiz translation keys have nonempty Japanese and English text", () => {
  for (const collection of [quiz.quizMessages]) {
    const ja = Object.keys(collection.ja).sort();
    const en = Object.keys(collection.en).sort();
    assert.deepEqual(ja, en);
    assert.ok(ja.length >= 70, "Shared quiz copy was not consolidated");
    for (const key of ja) {
      assert.ok(collection.ja[key]?.trim(), "Missing Japanese: " + key);
      assert.ok(collection.en[key]?.trim(), "Missing English: " + key);
      assert.equal(quiz.quizText("ja", key), collection.ja[key]);
      assert.equal(quiz.quizText("en", key), collection.en[key]);
    }
  }
  for (const key of ["heading", "intro", "language", "settings",
    "languageHelp", "languageJapanese", "languageEnglish", "languageSaved",
    "metaTitle", "metaDescription"]) {
    assert.ok(ui.translate("ja", key).trim());
    assert.ok(ui.translate("en", key).trim());
  }
});

test("each of 197 country names, aliases and phonetic readings has independent language keys", () => {
  assert.equal(countries.length, 197);
  for (const country of countries) {
    for (const language of ["ja", "en"]) {
      assert.ok(country.names[language]);
      assert.ok(Array.isArray(country.aliases[language]));
      assert.ok(country.aliases[language].every(Boolean));
      assert.ok((country.readings?.[language] ?? []).every(Boolean));
    }
  }
});

test("settings panel is reachable by keyboard and shares one locale state across four modes", () => {
  const app = readFileSync("src/app/App.tsx", "utf8");
  const hook = readFileSync("src/i18n/useLocale.ts", "utf8");
  const styles = readFileSync("src/app/App.css", "utf8");
  const pages = ["NameQuiz", "NameToMapQuiz", "NameToFlagQuiz", "RegionSelector"];
  assert.ok(app.includes('<details className="language-settings">'));
  assert.ok(app.includes("<summary>"));
  assert.ok(app.includes('name="geo-quiz-language"'));
  assert.ok(app.includes('checked={locale === "ja"}'));
  assert.ok(app.includes('checked={locale === "en"}'));
  assert.ok(app.includes('onChange={() => setLocale("ja")}'));
  assert.ok(app.includes('onChange={() => setLocale("en")}'));
  assert.ok(app.includes("<MapToNameQuiz locale={locale} />"));
  assert.ok(app.includes("<FlagToNameQuiz locale={locale} />"));
  assert.ok(app.includes("<NameToMapQuiz locale={locale} />"));
  assert.ok(app.includes("<NameToFlagQuiz locale={locale} />"));
  assert.ok(hook.includes("resolveLocale(stored, preferred)"));
  assert.ok(hook.includes("localStorage.setItem(LOCALE_STORAGE_KEY, locale)"));
  assert.ok(hook.includes("document.documentElement.lang = locale"));
  assert.ok(hook.includes('document.title = translate(locale, "metaTitle")'));
  assert.ok(hook.includes('meta[name="description"]'));
  assert.ok(styles.includes(".language-settings__panel"));
  assert.ok(styles.includes("calc(100vw - 32px)"));
  for (const name of pages) {
    const code = readFileSync("src/features/quiz/" + name + ".tsx", "utf8");
    assert.ok(code.includes("quizText(locale, key)"), name + " not using shared strings");
  }
  assert.ok(readFileSync("src/map/WorldMap.tsx", "utf8").includes("quizText(locale, key)"));
});

test("language choice changes the text answer contract but never the question ID", async () => {
  const engine = await importPure("src/game-engine/engine.ts");
  const jp = countries.find((c) => c.id === "JP");
  const question = { number: 1, countryId: "JP", quizKind: "map-to-name", answerFormat: "text" };
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "日本" }, jp, "ja"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "日本" }, jp, "en"), "incorrect");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "Japan" }, jp, "en"), "correct");
  assert.equal(engine.judgeAnswer(question, { format: "text", value: "Japan" }, jp, "ja"), "incorrect");
  assert.deepEqual(engine.getAnswerFormats("map-to-name"), ["text", "multiple-choice"]);
  assert.equal(jp.id, "JP");
});
