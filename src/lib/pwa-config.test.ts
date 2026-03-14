import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("pwa config does not enable front-end navigation caching", () => {
  const source = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

  assert.doesNotMatch(source, /cacheOnFrontEndNav:\s*true/);
});

test("manifest start_url uses the app entry route instead of dashboard", () => {
  const source = readFileSync(new URL("../app/manifest.ts", import.meta.url), "utf8");

  assert.match(source, /start_url:\s*"\/"/);
});
