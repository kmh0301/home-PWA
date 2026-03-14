import test from "node:test";
import assert from "node:assert/strict";

import { getRequestedOnboardingRouteFromHeaders } from "./request-route.ts";

test("prefers middleware pathname/search headers when next-url is unavailable", () => {
  const headers = new Headers({
    "x-pathname": "/onboarding/create",
    "x-search": "?joined=1",
  });

  const route = getRequestedOnboardingRouteFromHeaders(headers);

  assert.deepEqual(route, {
    pathname: "/onboarding/create",
    joined: true,
  });
});

test("falls back to null route for unsupported paths", () => {
  const headers = new Headers({
    "x-pathname": "/settings",
  });

  const route = getRequestedOnboardingRouteFromHeaders(headers);

  assert.deepEqual(route, {
    pathname: null,
    joined: false,
  });
});
