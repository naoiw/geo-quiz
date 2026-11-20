import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Android back navigation is native-only and cleans up the listener", () => {
  const source = readFileSync("src/android/useAndroidBackButton.ts", "utf8");
  const app = readFileSync("src/app/App.tsx", "utf8");
  assert.match(source, /Capacitor\.isNativePlatform\(\)/);
  assert.match(source, /NativeApp\.addListener\("backButton"/);
  assert.match(source, /state\.returnToModes\(\)/);
  assert.match(source, /NativeApp\.exitApp\(\)/);
  assert.match(source, /handle\.remove\(\)/);
  assert.match(app, /useAndroidBackButton\(activeMode !== null, backToModes\)/);
});

test("Android display reserves platform safe areas", () => {
  const css = readFileSync("src/app/App.css", "utf8");
  const html = readFileSync("index.html", "utf8");
  assert.ok(css.includes("safe-area-inset-top"));
  assert.ok(css.includes("safe-area-inset-bottom"));
  assert.ok(html.includes("viewport-fit=cover"));
});
