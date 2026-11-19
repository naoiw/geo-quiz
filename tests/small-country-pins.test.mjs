import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const world = JSON.parse(readFileSync("src/map/world-50m.json", "utf8"));
const map = readFileSync("src/map/WorldMap.tsx", "utf8");
const marker = readFileSync("src/map/SmallCountryMarker.tsx", "utf8");
const css = readFileSync("src/map/WorldMap.css", "utf8");

const source = readFileSync("src/map/location-pin.ts", "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { needsLocationPin } = await import(
  "data:text/javascript;base64," + Buffer.from(outputText).toString("base64")
);
const byId = new Map(world.features.filter((feature) => feature.id)
  .map((feature) => [feature.id, feature]));

test("small countries receive pins, while large countries keep their polygon-only highlights", () => {
  for (const id of ["VA", "MC", "SM", "LI", "NR", "TV", "SG", "CY", "WS"]) {
    assert.equal(needsLocationPin(byId.get(id), 360), true, id);
  }
  for (const id of ["US", "JP", "RU", "CN", "UZ"]) {
    assert.equal(needsLocationPin(byId.get(id), 360), false, id);
  }
});

test("pin visibility is zoom-aware rather than blindly tied to the tiny flag", () => {
  const vietnam = byId.get("VN");
  assert.equal(vietnam.tiny, true);
  assert.equal(needsLocationPin(vietnam, 360), true);
  assert.equal(needsLocationPin(vietnam, 170), false);

  const luxembourg = byId.get("LU");
  assert.equal(needsLocationPin(luxembourg, 360), true);
  assert.equal(needsLocationPin(luxembourg, 8), false);

  const vatican = byId.get("VA");
  assert.equal(needsLocationPin(vatican, 8), true);

  // Kiribati covers both sides of the antimeridian: bounding width is misleading.
  assert.ok(byId.get("KI").bounds[2] - byId.get("KI").bounds[0] > 180);
  assert.equal(needsLocationPin(byId.get("KI"), 360), true);
  assert.equal(needsLocationPin(byId.get("KI"), 8), true);
});

test("all 197 countries have finite representative centers for pin placement", () => {
  const playable = world.features.filter((feature) => feature.id);
  assert.equal(playable.length, 197);
  for (const feature of playable) {
    assert.equal(feature.center.length, 2);
    assert.ok(feature.center.every(Number.isFinite), feature.id);
    assert.ok(feature.center[0] >= 0 && feature.center[0] <= 360, feature.id);
    assert.ok(feature.center[1] >= 0 && feature.center[1] <= 180, feature.id);
  }
});

test("pins are drawn only for highlighted or selected countries, never reveal answers", () => {
  assert.ok(map.includes("needsLocationPin(feature, view.width)"));
  assert.ok(map.includes("countryId: highlightedCountryId"));
  assert.ok(map.includes("countryId: selectedCountryId"));
  assert.ok(map.includes('kind === "selected" && countryId === highlightedCountryId'));
  assert.ok(map.includes('<SmallCountryMarker'));
  assert.ok(map.includes('className="world-map__location-pins" pointerEvents="none"'));
  assert.ok(map.includes("onCountrySelect?.(candidate)"));
  assert.ok(map.includes('aria-label={!readOnly ? country?.names[locale] : undefined}'));
  assert.ok(marker.includes('pointerEvents="none"'));
  assert.ok(marker.includes('aria-hidden="true"'));
  assert.ok(!marker.includes("country.names"));
  assert.ok(marker.includes('viewport.x + viewport.width - inset'));
  assert.ok(marker.includes('x < viewport.x || x > viewport.x + viewport.width'));
});

test("selected and highlighted pins are visually distinguishable without blinking", () => {
  assert.ok(marker.includes("world-map__location-pin--"));
  assert.ok(marker.includes("world-map__pin-shape"));
  assert.ok(css.includes(".world-map__location-pin--selected"));
  assert.ok(css.includes("--pin-fill: #2563eb"));
  assert.ok(css.includes("--pin-fill: #f59e0b"));
  assert.ok(css.includes("stroke: #fff"));
  assert.ok(!css.includes("animation:"));
});
