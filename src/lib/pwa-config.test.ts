import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pwa config does not enable front-end navigation caching", () => {
  const source = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /cacheOnFrontEndNav:\s*true/);
});

test("next config does not wrap the app with next-pwa", () => {
  const source = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /withPWA/);
});

test("manifest start_url uses the app entry route instead of dashboard", () => {
  const layoutSource = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

  assert.match(layoutSource, /manifest:\s*undefined/);
});

test("service worker file actively unregisters old workers and clears caches", () => {
  const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");

  assert.match(source, /registration\.unregister/);
  assert.match(source, /caches\.keys/);
  assert.doesNotMatch(source, /client\.navigate/);
});
