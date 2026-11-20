import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (file) => readFileSync(file, "utf8");

test("The native Android project and Gradle wrapper are committed", () => {
  for (const file of [
    "android/gradlew",
    "android/gradlew.bat",
    "android/gradle/wrapper/gradle-wrapper.jar",
    "android/gradle/wrapper/gradle-wrapper.properties",
    "android/app/build.gradle",
    "android/app/src/main/AndroidManifest.xml",
    "android/app/src/main/java/io/github/naoiw/geoquiz/MainActivity.java",
  ]) {
    assert.ok(existsSync(file), file);
  }
  const config = read("android/variables.gradle");
  assert.match(config, /compileSdkVersion = 36/);
  assert.match(config, /targetSdkVersion = 36/);
  const gradle = read("android/app/build.gradle");
  assert.match(gradle, /applicationId "io\.github\.naoiw\.geoquiz"/);
  const activity = read("android/app/src/main/java/io/github/naoiw/geoquiz/MainActivity.java");
  assert.match(activity, /extends BridgeActivity/);
  const appGradle = read("android/app/capacitor.build.gradle");
  assert.match(appGradle, /implementation project\(':capacitor-app'\)/);
});

test("Native app resizes for the Android IME and has no committed credentials", () => {
  const manifest = read("android/app/src/main/AndroidManifest.xml");
  assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);
  assert.match(manifest, /android:exported="true"/);
  const ignore = read(".gitignore");
  assert.match(ignore, /\*\.jks/);
  assert.match(ignore, /\*\.keystore/);
  assert.match(ignore, /android\/local\.properties/);
});
