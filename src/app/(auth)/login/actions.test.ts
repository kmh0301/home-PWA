import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("auth actions use the server action supabase client instead of the generic server client", () => {
  const source = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");

  assert.match(source, /getSupabaseServerActionClient/);
  assert.doesNotMatch(source, /getSupabaseServerClient\(\)/);
});
