import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("onboarding layout does not redirect when requested route header is unavailable", () => {
  const source = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

  assert.match(source, /requestedRoute\.pathname &&/);
  assert.doesNotMatch(source, /!requestedRoute\.pathname \|\|/);
});
