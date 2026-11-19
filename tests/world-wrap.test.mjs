import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

async function loadTsModule(path) {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return import("data:text/javascript;base64," +
    Buffer.from(compiled.outputText).toString("base64"));
}

const {
  WORLD_WIDTH, wrapMapX, constrainMapView, visibleWorldOffsets,
  nearestWorldOffset, wrappedPointX,
} = await loadTsModule("src/map/world-wrap.ts");
const map = readFileSync("src/map/WorldMap.tsx", "utf8");
const marker = readFileSync("src/map/SmallCountryMarker.tsx", "utf8");

test("map longitude loops every 360 degrees without unbounded coordinate drift", () => {
  assert.equal(WORLD_WIDTH, 360);
  for (const x of [-720, -360, -180, -1, 0, 1, 179.9, 180, 359.9, 360, 720]) {
    assert.ok(wrapMapX(x) >= -180 && wrapMapX(x) < 180);
    assert.ok(Math.abs(wrapMapX(x) - wrapMapX(x + 360)) < 1e-9, x);
    assert.ok(Math.abs(wrapMapX(x) - wrapMapX(x - 360)) < 1e-9, x);
  }
  assert.equal(wrapMapX(180), -180);
  assert.equal(wrapMapX(-181), 179);
  assert.equal(wrapMapX(360), 0);
});

test("horizontal panning wraps but latitude is still bounded by the poles", () => {
  assert.deepEqual(constrainMapView({ x: 350, y: -45, width: 120, height: 60 }, 24),
    { x: -10, y: 0, width: 120, height: 60 });
  assert.deepEqual(constrainMapView({ x: -350, y: 160, width: 120, height: 60 }, 24),
    { x: 10, y: 120, width: 120, height: 60 });
  assert.deepEqual(constrainMapView({ x: 370, y: 170, width: 500, height: 30 }, 24),
    { x: 10, y: 0, width: 360, height: 180 });
  assert.deepEqual(constrainMapView({ x: -1, y: 35, width: 1, height: 1 }, 8),
    { x: -1, y: 35, width: 8, height: 4 });
});

test("draw only tiles visible in the viewport, including cross-antimeridian views", () => {
  const tiles = (x, width) => visibleWorldOffsets({ x, y: 0, width, height: width / 2 });
  assert.deepEqual(tiles(0, 360), [0]);
  assert.deepEqual(tiles(0, 8), [0]);
  assert.deepEqual(tiles(10, 350), [0]);
  assert.deepEqual(tiles(10, 360), [0, 360]);
  assert.deepEqual(tiles(-10, 80), [-360, 0]);
  assert.deepEqual(tiles(-180, 360), [-360, 0]);
  assert.deepEqual(tiles(179, 100), [0]);
  assert.deepEqual(tiles(299, 100), [0, 360]);
  assert.deepEqual(tiles(-179, 100), [-360]);
  assert.ok(tiles(-1, 8).length <= 2);
});

test("country positions remain visually continuous across the wrap", () => {
  // The same island 10 degrees west of the original 360-degree seam must
  // appear at the same screen x as the viewport crosses the normalization cut.
  const viewBefore = { x: 179.9, y: 0, width: 360, height: 180 };
  const viewAfter = { x: -179.9, y: 0, width: 360, height: 180 };
  const markerBefore = wrappedPointX(350, viewBefore) - viewBefore.x;
  const markerAfter = wrappedPointX(350, viewAfter) - viewAfter.x;
  assert.ok(Math.abs(markerBefore - markerAfter) < 0.3);
  assert.equal(nearestWorldOffset(350, viewBefore), 0);
  assert.equal(nearestWorldOffset(350, viewAfter), -360);

  // Crossing x=360 maps back to x=0 without moving the island onscreen.
  const a = constrainMapView({ x: 359.9, y: 0, width: 360, height: 180 }, 24);
  const b = constrainMapView({ x: 360.1, y: 0, width: 360, height: 180 }, 24);
  assert.ok(Math.abs((wrappedPointX(8, a) - a.x) -
    (wrappedPointX(8, b) - b.x)) < 0.3);
});

test("world copies retain country IDs, mouse/touch selection and a single keyboard target", () => {
  assert.ok(map.includes("visibleTiles.map((offset)"));
  assert.ok(map.includes('transform={`translate(${offset} 0)`}'));
  assert.ok(map.includes("className=\"world-map__land\""));
  assert.ok(map.includes("data-country-id={country?.id}"));
  assert.ok(map.includes("data-country-id={id}"));
  assert.ok(map.includes("onCountrySelect?.(candidate)"));
  assert.ok(map.includes("offset === nearestWorldOffset(feature.center[0], view)"));
  assert.ok(map.includes('tabIndex={keyboardCopy ? 0 : undefined}'));
  assert.ok(map.includes("aria-label={keyboardCopy ? country?.names[locale] : undefined}"));
  assert.ok(map.includes("constrainMapView("));
  assert.ok(!map.includes("Math.min(WORLD.width - width, view.x)"));
});

test("small-country pin and focus use the wrapped map position", () => {
  assert.ok(map.includes("wrappedPointX(feature.center[0], view)"));
  assert.ok(map.includes("needsLocationPin(feature, view.width)"));
  assert.ok(map.includes("focusOn(feature)"));
  assert.ok(map.includes('focusCountryId ? featureById.get(focusCountryId)'));
  assert.ok(map.includes('pointerEvents="none" aria-hidden="true"'));
  assert.ok(marker.includes('pointerEvents="none"'));
  assert.ok(map.includes('!readOnly && <g className="world-map__microstate-hit-areas"'));
});
