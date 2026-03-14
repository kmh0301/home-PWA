# Phase 1 Foundation Verification

## Purpose

This runbook verifies the Phase 1 foundation for Home PWA:

- auth and protected-route behavior
- household membership routing
- household data isolation
- `Asia/Hong_Kong` date boundary helpers

Use this after implementing Phase 1 plans and before treating the security boundary as stable.

## Automated Checks

Run these from the repo root:

```bash
npm run lint
npx tsc --noEmit
```

Expected result:

- both commands pass

## Local Route Checks

Start the app locally:

```bash
npm run dev
```

Check these unauthenticated responses:

- `GET /` or `HEAD /` redirects to `/login`
- `GET /login` renders successfully
- `GET /auth/callback` without a code redirects to login with an explanatory error state

If Supabase env vars are not configured locally:

- protected routes must not crash with a 500
- `/dashboard` and `/onboarding/create` may fall back to a stable shell/page response instead of full authenticated behavior

If Supabase is configured and a real session is available:

- signed-out access to protected routes redirects to `/login`
- signed-in user without `household_members` membership is routed into onboarding
- signed-in user with valid membership reaches the protected app shell
- `/login` is not treated as an alternate app home for an authenticated user

## Hong Kong Boundary Helper Check

Compile and run the boundary fixture module:

```bash
rm -rf /tmp/home-pwa-phase1-time-check
npx tsc src/lib/time/hong-kong.ts src/lib/time/hong-kong.testable.ts --module commonjs --target es2020 --outDir /tmp/home-pwa-phase1-time-check
node /tmp/home-pwa-phase1-time-check/hong-kong.testable.js
```

Expected result:

- the command prints three successful expectation objects
- no exception is thrown

This confirms:

- HKT day boundaries use UTC+8 correctly
- Monday-week calculations anchor to Hong Kong local time
- month boundaries follow Hong Kong local calendar dates, not UTC month edges

## Supabase Household Isolation Check

Prerequisites:

- Supabase CLI authenticated and linked, or a working local database
- Phase 1 migration applied
- two seeded households for cross-household checks

Recommended workflow:

```bash
supabase db push
psql "$SUPABASE_DB_URL" -v foreign_household_id='<foreign-household-uuid>' -f supabase/verify/phase-1-household-isolation.sql
```

Expected result:

- helper RPCs are listed
- same-household queries return rows only from the authenticated actor's household
- every cross-household query returns zero rows

If Docker or a linked/authenticated Supabase target is unavailable, record that as a blocked external verification rather than treating it as a pass.

## Evidence To Record

Capture and store:

- `npm run lint` result
- `npx tsc --noEmit` result
- route probe results for `/`, `/login`, `/auth/callback`, `/dashboard`, `/onboarding/create`
- Hong Kong boundary helper output
- SQL isolation results, or the explicit blocker preventing them

## Phase 1 Exit Criteria

Phase 1 is ready to mark complete when:

- static checks pass
- protected-route behavior is stable
- no-household versus active-household routing is understood and verified
- Hong Kong boundary helpers behave correctly for representative edge timestamps
- household isolation SQL is either passing on a real database or explicitly blocked by missing external setup
