import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const world = JSON.parse(readFileSync("src/map/world-50m.json", "utf8"));
const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));

test("every playable country is represented by exactly one mapped feature", () => {
  const mapped = world.features.filter((feature) => feature.id);
  assert.equal(mapped.length, countries.length);
  const ids = mapped.map((feature) => feature.id);
  assert.deepEqual([...ids].sort(), countries.map((country) => country.id));
  assert.equal(new Set(ids).size, 197);
});

test("SVG path data, bounds and markers are finite and valid", () => {
  assert.equal(world.features.length, 242);
  for (const feature of world.features) {
    assert.ok(feature.d.startsWith("M"));
    assert.ok(feature.d.endsWith("Z"));
    assert.match(feature.d, /^[-.0-9, MLZ]+$/);
    assert.equal(feature.bounds.length, 4);
    assert.equal(feature.center.length, 2);
    assert.ok(feature.bounds.every(Number.isFinite));
    assert.ok(feature.center.every(Number.isFinite));
    assert.ok(feature.bounds[0] <= feature.bounds[2]);
    assert.ok(feature.bounds[1] <= feature.bounds[3]);
    assert.ok(feature.bounds[0] >= 0 && feature.bounds[2] <= 360);
    assert.ok(feature.bounds[1] >= 0 && feature.bounds[3] <= 180);
  }
});

test("known naming mismatches and tiny countries are mapped", () => {
  const byId = new Map(world.features.filter((f) => f.id).map((f) => [f.id, f]));
  for (const id of ["TW", "XK", "PS", "SS", "JP", "US", "VA", "MC", "NR", "TV", "KI"]) {
    assert.ok(byId.has(id), "Missing country " + id);
  }
  assert.equal(byId.get("VA").tiny, true);
  assert.equal(byId.get("MC").tiny, true);
  assert.equal(byId.get("NR").tiny, true);
  assert.ok(world.features.some((f) => f.id === null), "Background polygons should remain visible");
});

test("tiny-country hit targets do not draw markers over the map", () => {
  const mapComponent = readFileSync("src/map/WorldMap.tsx", "utf8");
  const mapStyles = readFileSync("src/map/WorldMap.css", "utf8");
  assert.match(mapComponent, /className="world-map__microstate-hit-area"/);
  assert.match(mapStyles, /\.world-map__microstate-hit-area\s*\{\s*fill: transparent;\s*stroke: none;/);
  assert.doesNotMatch(mapComponent, /world-map__pin/);
});

test("country selection and focus do not draw a black SVG focus frame", () => {
  const mapStyles = readFileSync("src/map/WorldMap.css", "utf8");
  assert.match(
    mapStyles,
    /\.world-map__country:focus,\s*\.world-map__country:focus-visible\s*\{\s*outline: none;\s*box-shadow: none;/,
  );
  assert.doesNotMatch(
    mapStyles,
    /\.world-map__country:focus-visible\s*\{[^}]*\bstroke\s*:/,
  );
});
