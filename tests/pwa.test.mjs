import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildServiceWorker } from "../scripts/pwa-worker.mjs";

test("PWA manifest and icon assets have correct scoped paths", () => {
  const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith("./"));
    assert.ok(existsSync(join("public", icon.src.slice(2))), icon.src);
  }
  for (const size of ["192x192", "512x512"]) {
    assert.ok(manifest.icons.some((icon) => icon.sizes === size && icon.type === "image/png"));
  }
  const html = readFileSync("index.html", "utf8");
  const main = readFileSync("src/main.tsx", "utf8");
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.ok(html.includes('%BASE_URL%manifest.webmanifest'));
  assert.ok(main.includes("import.meta.env.PROD"));
  assert.ok(main.includes('import.meta.env.BASE_URL + "sw.js"'));
  assert.ok(main.includes("scope: import.meta.env.BASE_URL"));
  assert.equal(pkg.scripts.postbuild, "node scripts/build-service-worker.mjs");
});

test("worker precaches every build artifact and rotates its version on changes", () => {
  const dist = mkdtempSync(join(tmpdir(), "geo-quiz-pwa-"));
  try {
    mkdirSync(join(dist, "assets"));
    mkdirSync(join(dist, "flags"));
    writeFileSync(join(dist, "index.html"), "<html>v1</html>");
    writeFileSync(join(dist, "manifest.webmanifest"), "{}");
    writeFileSync(join(dist, "assets/app.js"), "console.log('one')");
    writeFileSync(join(dist, "flags/jp.svg"), "<svg/>");
    const first = buildServiceWorker(dist);
    const worker = readFileSync(join(dist, "sw.js"), "utf8");
    assert.ok(first.cacheName.startsWith("geo-quiz-"));
    for (const file of ["./", "./index.html", "./assets/app.js", "./flags/jp.svg", "./manifest.webmanifest"]) {
      assert.ok(worker.includes('"' + file + '"'), "Missing precache " + file);
    }
    assert.ok(!first.files.includes("sw.js"));
    assert.ok(worker.includes('event.request.mode === "navigate"'));
    assert.ok(worker.includes("caches.match(OFFLINE_ENTRY)"));
    assert.equal(buildServiceWorker(dist).cacheName, first.cacheName, "Generated worker should not change its own hash");
    writeFileSync(join(dist, "assets/app.js"), "console.log('two')");
    assert.notEqual(buildServiceWorker(dist).cacheName, first.cacheName);
  } finally {
    rmSync(dist, { recursive: true, force: true });
  }
});
