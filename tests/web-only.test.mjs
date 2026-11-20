import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("the Web distribution does not retain native application setup", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.equal(Object.keys(pkg.dependencies).some((key) => key.startsWith("@capacitor/")), false);
  assert.equal(Object.keys(pkg.devDependencies).some((key) => key.startsWith("@capacitor/")), false);
  assert.equal(Object.keys(pkg.scripts).some((key) => key.startsWith("android:") || key === "build:android"), false);
  for (const path of ["android", "capacitor.config.ts", "src/android", "docs/ANDROID.md", ".github/workflows/android.yml"]) {
    assert.ok(!existsSync(path), `Native-only path remains: ${path}`);
  }
  const main = readFileSync("src/main.tsx", "utf8");
  assert.ok(main.includes('import.meta.env.PROD && "serviceWorker" in navigator'));
  assert.ok(!main.includes("Capacitor"));
});
