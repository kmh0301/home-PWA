import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("register form includes a displayName field for sign up action", () => {
  const source = readFileSync(
    new URL("./animated-characters-login-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /name="displayName"/);
});
