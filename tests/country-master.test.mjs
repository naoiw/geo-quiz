import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const countries = JSON.parse(
  readFileSync("src/country-data/countries.json", "utf8"),
);
const regionIds = new Set(["africa", "asia", "europe", "north-america", "south-america", "oceania"]);
const counts = { "un-member": 193, observer: 2, additional: 2 };

test("197 entries cover 193 UN members, two observers and two additions", () => {
  assert.equal(countries.length, 197);
  for (const [status, expected] of Object.entries(counts)) {
    assert.equal(countries.filter((c) => c.classification === status).length, expected);
  }
  assert.deepEqual(countries.filter((c) => c.classification === "observer").map((c) => c.id), ["PS", "VA"]);
  assert.deepEqual(countries.filter((c) => c.classification === "additional").map((c) => c.id), ["TW", "XK"]);
});

test("all IDs, bilingual names, regions, and logical asset keys are valid", () => {
  const ids = new Set(), flags = new Set(), polygons = new Set();
  for (const c of countries) {
    assert.match(c.id, /^[A-Z]{2}$/);
    assert.ok(!ids.has(c.id), "Duplicate country ID " + c.id);
    ids.add(c.id);
    assert.ok(Object.hasOwn(counts, c.classification));
    assert.ok(c.regionIds.length > 0);
    for (const region of c.regionIds) assert.ok(regionIds.has(region), c.id + ": unknown region");
    for (const locale of ["ja", "en"]) {
      assert.ok(typeof c.names[locale] === "string" && c.names[locale].trim(), c.id + " missing " + locale);
      assert.ok(Array.isArray(c.aliases[locale]), c.id + " missing alias array");
      assert.equal(new Set(c.aliases[locale]).size, c.aliases[locale].length);
      assert.ok(!c.aliases[locale].includes(c.names[locale]));
    }
    assert.equal(c.flagId, c.id);
    assert.equal(c.geometryId, c.id);
    assert.ok(!flags.has(c.flagId));
    assert.ok(!polygons.has(c.geometryId));
    flags.add(c.flagId);
    polygons.add(c.geometryId);
    if (c.id === "XK") {
      assert.equal(c.isoAlpha2, null);
      assert.equal(c.isoAlpha3, null);
    } else {
      assert.equal(c.isoAlpha2, c.id);
      assert.match(c.isoAlpha3, /^[A-Z]{3}$/);
    }
  }
  assert.deepEqual([...ids], [...ids].sort());
});

test("edge cases and geographical grouping are explicit", () => {
  const byId = new Map(countries.map((c) => [c.id, c]));
  assert.equal(byId.get("JP").names.ja, "日本");
  assert.equal(byId.get("XK").names.ja, "コソボ");
  assert.equal(byId.get("TW").names.en, "Taiwan");
  assert.equal(byId.get("VA").classification, "observer");
  assert.equal(byId.get("PS").classification, "observer");
  assert.deepEqual(byId.get("RU").regionIds, ["europe"]);
  assert.deepEqual(byId.get("TR").regionIds, ["asia"]);
  assert.ok(byId.get("US").aliases.ja.includes("アメリカ"));
  assert.equal(countries.reduce((total, c) => total + c.regionIds.length, 0), 197);
});
