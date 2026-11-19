import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");
const app = read("src/app/App.tsx");
const appCss = read("src/app/App.css");
const status = read("src/features/quiz/QuizStatus.tsx");
const choice = read("src/features/quiz/CountryChoiceGrid.tsx");
const quizCss = read("src/features/quiz/NameQuiz.css");
const flagCss = read("src/features/quiz/NameToFlagQuiz.css");
const map = read("src/map/WorldMap.tsx");
const mapCss = read("src/map/WorldMap.css");
const modeCard = read("src/components/ModeCard.tsx");
const screens = [
  "src/features/quiz/NameQuiz.tsx",
  "src/features/quiz/NameToMapQuiz.tsx",
  "src/features/quiz/NameToFlagQuiz.tsx",
].map(read);

test("mode cards appear before the active quiz; only the selected mode mounts", () => {
  const selection = app.indexOf('className="mode-selection"');
  const game = app.indexOf('className="active-quiz"');
  const preview = app.indexOf('className="reference-demos"');
  assert.ok(selection >= 0 && selection < game && game < preview);
  assert.ok(app.includes("activeMode === \"map-to-name\""));
  assert.ok(app.includes("activeMode === \"flag-to-name\""));
  assert.ok(app.includes("activeMode === \"name-to-map\""));
  assert.ok(app.includes("activeMode === \"name-to-flag\""));
  assert.ok(app.includes("onPlay={openMode}"));
  assert.ok(app.includes("setShowPreviews(event.currentTarget.open)"));
  assert.ok(app.includes('{showPreviews && <div className="reference-demos__content">'));
  assert.ok(modeCard.includes('href={"#" + mode.id + "-quiz"}'));
  assert.ok(modeCard.includes("event.preventDefault()"));
  assert.ok(app.includes("readModeFromHash()"));
  assert.ok(app.includes('window.addEventListener("hashchange", syncRoute)'));
});

test("navigation provides visible back action, keyboard focus and bilingual labels", () => {
  assert.ok(app.includes("backToModes"));
  assert.ok(app.includes("backToModes()") || app.includes("onClick={backToModes}"));
  assert.ok(app.includes('ref={quizPanelRef} tabIndex={-1}'));
  assert.ok(app.includes('ref={modeHeadingRef} tabIndex={-1}'));
  assert.ok(app.includes("target?.focus()"));
  assert.ok(appCss.includes(".active-quiz__back"));
  assert.ok(appCss.includes("min-height: 44px"));
  assert.ok(appCss.includes(".reference-demos > summary"));
  const messages = read("src/i18n/messages.ts");
  for (const key of ["activeQuiz", "quizNavigation", "backToModes", "referenceDemos"]) {
    assert.ok(messages.includes(key + ":"), key);
  }
});

test("all four quiz modes share progress, keyboard-aware feedback and result presentation", () => {
  for (const screen of screens) {
    assert.ok(screen.includes("<QuizProgress"), "missing shared progress");
    assert.ok(screen.includes("<QuizFeedback"), "missing feedback");
    assert.ok(screen.includes("<QuizResultSummary"), "missing results");
    assert.ok(screen.includes("advanceSession("), "engine progress no longer connected");
    assert.ok(screen.includes("getResult("), "result engine disconnected");
  }
  assert.ok(status.includes('role="progressbar"'));
  assert.ok(status.includes("aria-valuenow={completed}"));
  assert.ok(status.includes("reviewed ? 1 : 0"));
  assert.ok(status.includes('role="status" aria-live="polite"'));
  assert.ok(status.includes("nextRef.current?.focus()"));
  assert.ok(status.includes("titleRef.current?.focus()"));
  assert.ok(status.includes("quiz__review-symbol"));
  assert.ok(status.includes('role="timer"'));
});

test("touch controls stay accessible with explicit ✓/× markers, not only border colors", () => {
  assert.ok(choice.includes('aria-hidden="true">✓</span>'));
  assert.ok(choice.includes('aria-hidden="true">×</span>'));
  assert.ok(quizCss.includes(".quiz__choice--wrong { border-width: 2px; border-style: dashed; }"));
  assert.ok(quizCss.includes(".quiz__review-symbol"));
  assert.ok(quizCss.includes("min-height: 44px"));
  assert.ok(quizCss.includes("max-width: 620px"));
  assert.ok(flagCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))") ||
    quizCss.includes("grid-template-columns: repeat(2, minmax(0, 1fr))"));
  assert.ok(quizCss.includes("prefers-reduced-motion: reduce"));
});

test("2D map supports drag/touch plus keyboard zoom and pan independently of country choices", () => {
  assert.ok(map.includes("onPointerDown={handlePointerDown}"));
  assert.ok(map.includes("onMapKeyDown"));
  assert.ok(map.includes("onKeyDown={onMapKeyDown}"));
  assert.ok(map.includes("ArrowLeft") && map.includes("ArrowRight"));
  assert.ok(map.includes("ArrowUp") && map.includes("ArrowDown"));
  assert.ok(map.includes('tabIndex={0}'));
  assert.ok(map.includes("onCountryKey"));
  assert.ok(map.includes("onCountrySelect?.(id)"));
  assert.ok(map.includes("aria-describedby={hintId}"));
  assert.ok(mapCss.includes(".world-map__svg:focus-visible"));
  assert.ok(mapCss.includes("min-width: 44px; min-height: 44px"));
  assert.ok(mapCss.includes("max-width: 620px"));
});
