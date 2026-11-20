import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("the player-facing home screen has no development progress or roadmap blocks", () => {
  const app = read("src/app/App.tsx");
  const css = read("src/app/App.css");
  const modeCard = read("src/components/ModeCard.tsx");
  for (const obsolete of ["foundation-note", "next-step", "map-demo__notice"]) {
    assert.ok(!app.includes(obsolete), `Unexpected development notice: ${obsolete}`);
    assert.ok(!css.includes(obsolete), `Unused style remains: ${obsolete}`);
  }
  assert.ok(!modeCard.includes('t("available")'));
  assert.ok(app.includes('className="mode-selection"'));
  assert.ok(app.includes('className="reference-demos"'));
});

test("Japanese and English UI copy only describes playable features and rules", () => {
  const home = read("src/i18n/messages.ts");
  const quiz = read("src/i18n/quizMessages.ts");
  for (const stale of [
    "開発基盤を準備しました",
    "開発予定",
    "次の開発",
    "未実装",
    "Project foundation is ready",
    "What's next",
    "not implemented yet",
  ]) {
    assert.ok(!home.includes(stale), `Stale translation: ${stale}`);
  }
  assert.ok(!quiz.includes("暫定"));
  assert.ok(!quiz.includes("provisional"));
  assert.ok(quiz.includes("100 points"));
});
