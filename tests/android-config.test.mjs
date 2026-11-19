import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Capacitor Android uses a local asset base independent of GitHub Pages", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const cfg = readFileSync("capacitor.config.ts", "utf8");
  assert.equal(pkg.scripts["build:pages:main"], "npm run build -- --base=/geo-quiz/");
  assert.equal(pkg.scripts["build:android"], "npm run build -- --base=./");
  assert.match(cfg, /webDir: "dist"/);
  assert.match(cfg, /appId: "io\.github\.naoiw\.geoquiz"/);
});

test("The Android WebView does not register the browser PWA service worker", () => {
  const main = readFileSync("src/main.tsx", "utf8");
  assert.match(main, /!Capacitor\.isNativePlatform\(\)/);
  assert.match(main, /serviceWorker/);
});
