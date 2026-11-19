import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const src = readFileSync("src/map/globe-projection.ts", "utf8");
const transpiled = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const projection = await import("data:text/javascript;base64," +
  Buffer.from(transpiled.outputText).toString("base64"));
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9,
  `${actual} ≠ ${expected}`);

test("three.js sphere mapping preserves the canonical longitude and latitude coordinates", () => {
  const samples = [
    [[180, 90], [1, 0, 0]],
    [[270, 90], [0, 0, -1]],
    [[90, 90], [0, 0, 1]],
    [[180, 0], [0, 1, 0]],
    [[180, 180], [0, -1, 0]],
  ];
  for (const [coordinate, expected] of samples) {
    const actual = projection.mapPointToGlobe(...coordinate);
    actual.forEach((value, i) => close(value, expected[i]));
    close(Math.hypot(...actual), 1);
  }
  assert.deepEqual(projection.globeUvToMapPoint(0.5, 0.5), { x: 180, y: 90 });
  assert.deepEqual(projection.globeUvToMapPoint(0, 0), { x: 0, y: 180 });
  assert.deepEqual(projection.globeUvToMapPoint(1, 1), { x: 360, y: 0 });
});

test("the six broad region presets contain valid normalized globe coordinates", () => {
  for (const region of ["world", "africa", "asia", "europe", "north-america",
    "south-america", "oceania"]) {
    const coords = projection.globeRegionCenter(region);
    assert.equal(coords.length, 2);
    assert.ok(coords[0] >= 0 && coords[0] <= 360);
    assert.ok(coords[1] >= 0 && coords[1] <= 180);
    close(Math.hypot(...projection.mapPointToGlobe(...coords)), 1);
  }
});

test("2D and lazy 3D renderers share IDs and cannot change the quiz session", () => {
  const view = readFileSync("src/map/WorldView.tsx", "utf8");
  const globe = readFileSync("src/map/WorldGlobe.tsx", "utf8");
  const name = readFileSync("src/features/quiz/NameQuiz.tsx", "utf8");
  const answerMap = readFileSync("src/features/quiz/NameToMapQuiz.tsx", "utf8");
  assert.ok(view.includes('useState<"2d" | "3d">("2d")'));
  assert.ok(view.includes('lazy(() => import("./WorldGlobe")'));
  assert.ok(view.includes("<WorldMap {...props} />"));
  assert.ok(view.includes("<WorldGlobe {...props}"));
  assert.ok(name.includes("<WorldView"));
  assert.ok(answerMap.includes("<WorldView"));
  assert.ok(answerMap.includes('mode={review ? "highlight" : "answer"}'));
  assert.ok(answerMap.includes("focusCountryId={review?.correctCountryId ?? null}"));
  assert.ok(globe.includes('mode === "answer" ? null : highlightedCountryId'));
  assert.ok(globe.includes("selectionRef.current.onCountrySelect"));
  assert.ok(!globe.includes("submitAnswer("));
  assert.ok(!globe.includes("judgeAnswer("));
});
