import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync("src/app/App.tsx", "utf8");
const css = readFileSync("src/features/quiz/NameQuiz.css", "utf8");

test("home hero and reference demos appear only outside active quiz mode", () => {
  assert.match(app, /\{!activeMode && \(\s*<section className="hero"/);
  assert.match(app, /\{!activeMode && \(\s*<>\s*<details\s+className="reference-demos"/);
  assert.ok(app.includes('activeMode === "map-to-name"'));
  assert.ok(app.includes('activeMode === "flag-to-name"'));
  assert.ok(app.includes('activeMode === "name-to-map"'));
  assert.ok(app.includes('activeMode === "name-to-flag"'));
  assert.ok(app.includes('ref={quizPanelRef} tabIndex={-1}'));
});

test("phone status and input controls prevent clipping and focus zoom", () => {
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.ok(css.includes('.quiz__stats { display: grid; grid-template-columns: minmax(0, 1fr) auto; }'));
  assert.ok(css.includes('.quiz__timer { grid-column: 1 / -1; }'));
  assert.ok(css.includes('.quiz__label select, .quiz__answer-input-row input { font-size: 16px; }'));
  assert.ok(css.includes('.quiz__choice { overflow-wrap: anywhere; }'));
  assert.ok(css.includes('grid-template-columns: 1fr;'));
  assert.ok(css.includes('min-height: 44px'));
});
