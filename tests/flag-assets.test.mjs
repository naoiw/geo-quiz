import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const countries = JSON.parse(readFileSync("src/country-data/countries.json", "utf8"));
const assetDirectory = "public/flags";
const expectedFiles = countries.map((country) => country.flagId.toLowerCase() + ".svg").sort();

test("197 flag IDs resolve to shipped local SVG files", () => {
  const actualFiles = readdirSync(assetDirectory).filter((file) => file.endsWith(".svg")).sort();
  assert.equal(actualFiles.length, 197);
  assert.deepEqual(actualFiles, expectedFiles);
  assert.equal(new Set(expectedFiles).size, expectedFiles.length);

  for (const country of countries) {
    assert.equal(country.flagId, country.id);
    const svg = readFileSync(join(assetDirectory, country.flagId.toLowerCase() + ".svg"), "utf8");
    assert.match(svg, /<svg(?:\s|>)/i, "Flag is not SVG: " + country.id);
    assert.match(svg, /viewBox=/i, "Flag lacks intrinsic geometry: " + country.id);
  }
});

test("special cases and the flag license are included", () => {
  for (const id of ["JP", "NP", "VA", "PS", "TW", "XK"]) {
    assert.ok(expectedFiles.includes(id.toLowerCase() + ".svg"), "Missing flag " + id);
  }
  assert.match(readFileSync(join(assetDirectory, "LICENSE.txt"), "utf8"), /MIT License/);
});
