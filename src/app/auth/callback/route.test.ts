import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("auth callback route persists auth cookies on the redirect response", () => {
  const routeSource = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
  const helperSource = readFileSync(
    new URL("../../../lib/supabase/route-handler.ts", import.meta.url),
    "utf8",
  );

  assert.match(routeSource, /createRouteHandlerClient/);
  assert.doesNotMatch(routeSource, /getSupabaseServerClient\(\)/);
  assert.match(helperSource, /response\.cookies\.set/);
});
