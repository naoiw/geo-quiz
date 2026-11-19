import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const flags = new Set(readdirSync("public/flags").filter((file) => file.endsWith(".svg")));

async function loadEngine(path) {
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," + Buffer.from(compiled.outputText).toString("base64"));
}

const engine = await loadEngine("src/game-engine/engine.ts");
const choiceEngine = await loadEngine("src/features/quiz/name-choices.ts");

test("flag ID matches every country and its bundled SVG", () => {
  assert.equal(countries.length, 197);
  for (const country of countries) {
    assert.equal(country.flagId, country.id);
    assert.ok(flags.has(country.flagId.toLowerCase() + ".svg"), country.id);
  }
});

test("both flag answer formats run complete sessions in Japanese and English", () => {
  for (const locale of ["ja", "en"]) {
    for (const format of ["text", "multiple-choice"]) {
      let session = engine.startSession({
        quizKind: "flag-to-name", answerFormat: format,
        regionId: "asia", sessionRule: "ten-untimed",
      }, countries, { nowMs: 0, random: () => 0.19 });
      const seen = new Set();
      for (let step = 0; step < 10; step++) {
        const correct = engine.getQuestionCountry(session);
        assert.ok(correct);
        assert.equal(session.currentQuestion.quizKind, "flag-to-name");
        assert.ok(flags.has(correct.flagId.toLowerCase() + ".svg"));
        assert.ok(!seen.has(correct.id));
        seen.add(correct.id);
        if (format === "multiple-choice") {
          const options = choiceEngine.createCountryNameChoices(
            correct.id, session.countryPool, locale, () => 0.31,
          );
          assert.equal(options.length, 4);
          assert.equal(options.filter((option) => option.countryId === correct.id).length, 1);
          assert.equal(new Set(options.map((option) => option.label)).size, 4);
        }
        const answer = format === "text"
          ? { format, value: correct.names[locale] }
          : { format, countryId: correct.id };
        session = engine.submitAnswer(session, answer, locale, step + 1);
        assert.equal(session.lastReview.judgement, "correct");
        session = engine.advanceSession(session, step + 1, () => 0.19);
      }
      const result = engine.getResult(session);
      assert.equal(result.correct, 10);
      assert.equal(result.score, 1000);
    }
  }
});

test("flag prompt hides the country name in alt while both quizzes share the same UI", () => {
  const quiz = readFileSync("src/features/quiz/NameQuiz.tsx", "utf8");
  const map = readFileSync("src/features/quiz/MapToNameQuiz.tsx", "utf8");
  const flag = readFileSync("src/features/quiz/FlagToNameQuiz.tsx", "utf8");
  const app = readFileSync("src/app/App.tsx", "utf8");
  const flagComponent = readFileSync("src/flags/CountryFlag.tsx", "utf8");
  assert.ok(quiz.includes('kind === "flag-to-name"'));
  assert.ok(quiz.includes('alt={qt("questionFlag")}'));
  const localized = readFileSync("src/i18n/quizMessages.ts", "utf8");
  assert.ok(localized.includes('"questionFlag": "問題の国旗"'));
  assert.ok(localized.includes('"questionFlag": "Question flag"'));
  assert.ok(quiz.includes("flagRegion.names[locale]"));
  assert.ok(quiz.includes("<CountryFlag") && quiz.includes("<WorldMap"));
  assert.ok(quiz.includes("useQuizSession(locale)") && quiz.includes("startRound("));
  assert.ok(quiz.includes("submit({ format: \"text\", value: answerText })"));
  assert.ok(flagComponent.includes("altOverride ??"));
  assert.ok(map.includes('kind="map-to-name"'));
  assert.ok(flag.includes('kind="flag-to-name"'));
  assert.ok(app.includes("<FlagToNameQuiz locale={locale} />"));
});
