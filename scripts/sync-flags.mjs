import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, "node_modules", "flag-icons", "flags", "4x3");
const targetDir = join(root, "public", "flags");
const licensePath = join(root, "node_modules", "flag-icons", "LICENSE");
const countries = JSON.parse(readFileSync(join(root, "src", "country-data", "countries.json"), "utf8"));

if (!existsSync(sourceDir) || !existsSync(licensePath)) {
  throw new Error("flag-icons is not installed. Run npm install before building or testing.");
}

const expected = new Set();
const missing = [];
for (const country of countries) {
  if (country.flagId !== country.id || !/^[A-Z]{2}$/.test(country.flagId)) {
    throw new Error("Invalid flag ID for " + country.id);
  }
  const filename = country.flagId.toLowerCase() + ".svg";
  if (expected.has(filename)) throw new Error("Duplicate flag ID: " + country.flagId);
  expected.add(filename);
  if (!existsSync(join(sourceDir, filename))) missing.push(country.flagId);
}

if (missing.length) {
  throw new Error("Missing source flags in flag-icons: " + missing.join(", "));
}
if (expected.size !== 197) {
  throw new Error("Expected 197 unique country flags; received " + expected.size);
}

mkdirSync(targetDir, { recursive: true });
for (const filename of readdirSync(targetDir)) {
  if (filename.endsWith(".svg") && !expected.has(filename)) {
    rmSync(join(targetDir, filename));
  }
}
for (const filename of expected) {
  copyFileSync(join(sourceDir, filename), join(targetDir, filename));
}
copyFileSync(licensePath, join(targetDir, "LICENSE.txt"));
console.log("Synced " + expected.size + " local SVG flags to public/flags.");
