# Phase 1 Research: Secure Foundation And Household Boundary

**Phase:** 1  
**Date:** 2026-03-13  
**Requirements:** `AUTH-01`, `AUTH-02`, `HOUS-04`

## Goal

Plan the minimum trustworthy foundation for Home PWA so all later household, finance, and chore work sits on correct authentication, route protection, household scoping, and Hong Kong time rules.

## Current Codebase Baseline

- `middleware.ts` already protects `/dashboard` and `/onboarding` when Supabase is configured, but it does not yet enforce a complete protected-app boundary.
- Auth pages and actions already exist under [`src/app/(auth)/login/page.tsx`](/Users/manheiko/Documents/GitHub/home-PWA/src/app/(auth)/login/page.tsx) and [`src/app/(auth)/login/actions.ts`](/Users/manheiko/Documents/GitHub/home-PWA/src/app/(auth)/login/actions.ts).
- Supabase client/server/middleware helpers already exist under [`src/lib/supabase/`](/Users/manheiko/Documents/GitHub/home-PWA/src/lib/supabase).
- Onboarding state resolution already reads `household_members` for the current user in [`src/lib/onboarding/state.ts`](/Users/manheiko/Documents/GitHub/home-PWA/src/lib/onboarding/state.ts).
- The database schema draft in [`docs/plans/DB-SCHEMA.sql`](/Users/manheiko/Documents/GitHub/home-PWA/docs/plans/DB-SCHEMA.sql) already defines the intended RLS and RPC shape for household isolation.

## What This Phase Must Establish

### 1. Auth correctness, not just auth screens

Phase 1 is not merely “login works.” It must establish:

- persistent session handling
- redirect behavior for protected routes
- server-side current-user resolution
- app-level entry routing based on auth and household state

This phase should ensure later feature code can ask a single trusted source for:

- current authenticated user
- current household membership
- current household ID

### 2. Household boundary as a first-class invariant

`HOUS-04` is the real security center of this phase. The app should not treat `household_id` as a loose client parameter. The trusted boundary should be:

- authenticated user
- verified membership in `household_members`
- database RLS and RPC checks

Every later feature assumes this invariant, so planning should include both schema/application wiring and verification.

### 3. Shared time rules anchored to `Asia/Hong_Kong`

The roadmap phase goal includes household time rules even though no explicit Phase 1 requirement ID names them. That is still important because:

- settlement month boundaries depend on Hong Kong time
- rotation logic later depends on Hong Kong week boundaries
- reminder and monthly job planning will otherwise fork logic later

Phase 1 should centralize time helpers and conventions now, even if cron jobs are not implemented yet.

## Codebase-Specific Planning Implications

### Middleware scope needs tightening

Current middleware matches:

- `/dashboard/:path*`
- `/login`
- `/auth/callback`

But the app also has onboarding flows and route groups that will expand. The plan should decide whether to:

- continue enumerating protected roots, or
- define a stronger protected matcher strategy for all app surfaces except explicitly public auth routes

Preferred direction: keep public routes explicit and treat the rest of authenticated product surfaces as protected.

### Household-aware routing belongs in one place

The repo already has onboarding-state logic and auth middleware. Planning should avoid duplicating routing decisions in multiple pages. Prefer:

- one shared server-side household resolver
- clear redirect rules:
  - no session -> `/login`
  - session + no household membership -> onboarding flow
  - session + household membership -> app shell/dashboard

### Database and app boundaries should align

`docs/plans/DB-SCHEMA.sql` already points toward:

- `get_user_household_ids()`
- RLS keyed to membership
- SECURITY DEFINER RPCs for sensitive mutations

Phase 1 should not try to implement the whole finance RPC surface, but it should lock in:

- schema migration application strategy
- typed database regeneration workflow
- proof that authenticated users cannot leak across household boundaries on the tables relevant to this phase

### Existing code may partially overlap future phases

There is already onboarding code in the repo. Phase 1 planning should avoid swallowing all onboarding implementation just because some pieces exist. Stay within the roadmap boundary:

- auth/session/protected access
- trusted household resolution and isolation
- time-rule groundwork

Household creation/join flows remain Phase 2 execution scope, though Phase 1 can prepare the primitives those flows rely on.

## Risks To Account For In The Plan

### Risk 1: False sense of security from UI-only protection

If middleware redirects are correct but RLS/policies are missing or unverified, the app will appear secure while data remains exposed through direct queries or future code paths.

Plan implication:
- include both app-surface protection and DB isolation verification work

### Risk 2: Mixing phase boundaries with onboarding feature delivery

Because some onboarding code already exists, planning could accidentally expand into invite flow completion. That dilutes Phase 1.

Plan implication:
- separate “foundation primitives used by onboarding” from “full onboarding journey”

### Risk 3: Timezone logic left implicit

If `Asia/Hong_Kong` rules are not centralized now, later finance/chore work will embed inconsistent date math.

Plan implication:
- include shared date/time utility and conventions as part of the phase

### Risk 4: No automated proof of cross-household isolation

This phase should not finish on assumption alone.

Plan implication:
- include integration or database verification for household isolation early

## Recommended Build Shape

### Plan A: Auth and route trust layer

Own:

- middleware matcher/protected-route behavior
- auth redirect rules
- session persistence expectations
- current user + household resolver used by app surfaces

### Plan B: Database trust layer and household isolation

Own:

- applying or reconciling the schema/migration baseline needed for this phase
- ensuring RLS/policy shape exists for household-bound tables
- typed database regeneration if schema changes land
- cross-household isolation verification

### Plan C: Shared time and boundary utilities

Own:

- `Asia/Hong_Kong` time helpers
- date-boundary utilities for month/day/week calculations
- developer-facing conventions so later phases reuse the same source of truth

This split is defensible because it separates:

- request/session boundary
- data/security boundary
- temporal boundary

while still allowing parallel execution.

## Dependencies And Preconditions

- Supabase environment variables must be configured for auth and server helpers.
- The migration strategy for the current project database must be clear before schema-dependent verification runs.
- If type generation changes are part of the phase, the plan should include regeneration of [`src/types/database.types.ts`](/Users/manheiko/Documents/GitHub/home-PWA/src/types/database.types.ts).

## Validation Architecture

Phase 1 should validate three things, in this order:

1. **Static correctness**
   - Typecheck/lint for middleware, auth helpers, and household resolver changes.
2. **Behavioral routing**
   - Manual or automated verification of redirect rules for:
     - signed-out user on protected page
     - signed-in user without household membership
     - signed-in user with household membership
3. **Data isolation**
   - Database-level verification that a user in household A cannot read rows belonging to household B for the household-scoped tables used in this phase.

Recommended quick commands for planning:

- `npm run lint`
- `npx tsc --noEmit`

Recommended manual checks:

- auth login/logout redirect behavior
- onboarding/dashboard redirect behavior based on membership presence

Recommended deeper verification:

- Supabase SQL or integration test script proving cross-household isolation on representative tables such as `households`, `household_members`, and `household_invites`

## Planning Notes For The Planner

- Do not plan all of onboarding in this phase.
- Do not plan finance RPC implementation beyond what is needed to prove the household security boundary.
- Do include RLS verification work; this is not optional background cleanup.
- Do derive `must_haves` from the phase goal, not only the three explicit requirement IDs.
- Do keep at least one plan focused on verification because this phase is foundational and later phases depend on its guarantees.

## Suggested Deliverables

- Improved protected-route and session-handling flow
- Trusted household context resolver for server-side use
- Phase-appropriate schema/RLS foundation applied or reconciled
- `Asia/Hong_Kong` time helper module and conventions
- Verification artifacts or tests proving auth gating and household isolation

## Open Questions

- Whether the repo’s current migration and local database workflow are already runnable or still partially documentary
- Whether route protection should target `/dashboard` only for now or expand to the broader authenticated app shell immediately
- Whether Phase 1 should include a reusable server-side “require household membership” helper consumed by later route groups
