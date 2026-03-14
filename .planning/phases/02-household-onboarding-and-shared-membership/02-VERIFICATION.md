# Phase 2 Verification: Household Onboarding And Shared Membership

**Date:** 2026-03-14  
**Verifier:** Codex  
**Status:** Passed-with-gaps

## Verdict

Phase 2 appears to satisfy the implementation side of the phase goal and the mapped requirements `HOUS-01`, `HOUS-02`, and `HOUS-03`, based on fresh static verification (`npm run lint`, `npx tsc --noEmit`) and direct code review of the onboarding, household, and Supabase lifecycle code.

I am not marking the phase as fully passed because I could not execute the DB/browser end-to-end checks in this session.

## Requirement Cross-Reference

- `02-01-PLAN.md` maps `HOUS-01`, `HOUS-02`, `HOUS-03`.
- `02-02-PLAN.md` maps `HOUS-01`, `HOUS-03`.
- `02-03-PLAN.md` maps `HOUS-01`, `HOUS-02`, `HOUS-03`.
- `REQUIREMENTS.md` assigns Phase 2 exactly to `HOUS-01`, `HOUS-02`, `HOUS-03`.

The plan artifacts and `REQUIREMENTS.md` are consistent: Phase 2 is scoped to the same three household requirements throughout.

## Evidence By Requirement

### HOUS-01: User can create a household group for a two-person home

Result: Satisfied in code.

Evidence:

- The Phase 2 migration enforces one active household membership per user with `UNIQUE (user_id)` on `household_members`, preventing multi-household membership ambiguity in v1: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:46-47`.
- Household bootstrap is handled by a single `create_household(...)` SECURITY DEFINER RPC that creates the household, creator membership, and initial invite in one PL/pgSQL function body rather than three app-side writes: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:307-388`.
- The create action calls the RPC directly and only redirects into the success state when `status === "success"` and all bootstrap outputs are present: `src/app/onboarding/actions.ts:163-203`.
- The create page renders the post-create success state with the new household name and invite code: `src/app/onboarding/create/page.tsx:50-103`.
- Two-person household lifecycle enforcement remains at the DB boundary through the existing max-two-member protection plus explicit `member_count >= 2` checks in the claim/regenerate RPCs: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:174-189`, `275-303`, `443-450`.

### HOUS-02: User can generate or share an invite code so a partner can join the same household

Result: Satisfied in code.

Evidence:

- Invite code generation is handled through `insert_household_invite_with_retry(...)`, which retries bounded code collisions instead of surfacing a raw unique-key failure: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:58-103`.
- Invite preview now returns household name, creator display name, member count, expiry, validity, and full-household state: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:107-191`.
- The create page prominently surfaces the 6-character code, expiry, household name, and copy/share controls: `src/app/onboarding/create/page.tsx:50-103`.
- The client share button uses both copy and native share paths and includes expiry in the shared message when available: `src/components/share-invite-code-button.tsx:20-57`.
- Owners can request a replacement invite through `regenerate_household_invite(...)`, which is owner-gated and blocked once the household is already full: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:391-499`, surfaced in `src/app/onboarding/actions.ts:295-324` and `src/app/onboarding/create/page.tsx:87-95`.

### HOUS-03: User can join an existing household with a valid invite code

Result: Satisfied in code.

Evidence:

- Signed-in users with no household are allowed to stay on either `/onboarding/create` or `/onboarding/join`, which fixes the earlier route break that blocked the partner join flow: `src/lib/onboarding/state.ts:72-97`, `src/app/onboarding/layout.tsx:51-71`.
- Invite validation and claim are separate server actions, with the join preview preserving the household identity and editable display name before the final confirmation: `src/app/onboarding/actions.ts:206-245`, `248-293`, `src/app/onboarding/join/page.tsx:53-145`.
- The join preview shows household name, creator display name, current member count, expiry, and a prefilled display name: `src/app/onboarding/join/page.tsx:76-145`.
- `claim_invite(...)` prevents reused, expired, full-household, and already-in-household claims, then inserts exactly one membership row and marks the invite used: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:195-305`.
- Successful claim now lands on a dedicated join-success milestone before account setup: `src/app/onboarding/actions.ts:285-292`, `src/app/onboarding/join/success/page.tsx:15-45`.
- Post-join onboarding continues to `/onboarding/accounts?joined=1`, which acknowledges the completed household join without replaying the same success step: `src/app/onboarding/join/success/page.tsx:40-45`, `src/app/onboarding/accounts/page.tsx:36-40`.
- Household resolution continues to come from the membership row, and `.maybeSingle()` remains sound because Phase 2 added the per-user uniqueness constraint: `src/lib/household/current-household.ts:24-48`, `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:46-47`.

## Membership Lifecycle Rule Check

Result: Satisfied in code.

Why:

- Stable member identity is preserved because join inserts one durable `household_members` row and later household resolution uses that row instead of recreating membership records: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:281-303`, `src/lib/household/current-household.ts:38-48`.
- Users are blocked from joining or creating a second household through both the unique membership constraint and explicit RPC checks: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:46-47`, `168-177`, `260-290`, `365-380`.
- Household capacity is protected before and during claim, so a third member cannot silently enter a two-person household: `supabase/migrations/20260314000000_phase_2_household_onboarding.sql:174-189`, `270-279`, `443-450`.

## Fresh Verification Run

Executed in this session:

- `npm run lint` -> passed
- `npx tsc --noEmit` -> passed

Not executed in this session:

- `supabase/verify/phase-2-household-onboarding.sql`
- live two-session authenticated browser verification

Environment limits:

- `SUPABASE_DB_URL` was not set in the current shell.
- `supabase status` failed because Docker was unavailable: `Cannot connect to the Docker daemon at unix:///Users/manheiko/.docker/run/docker.sock`.

## Gaps Blocking A Full Pass

### 1. No fresh runtime proof was possible for the DB and two-session UX flow

The code structure supports the phase goal, but I could not produce a fresh end-to-end runtime proof for:

- create -> share -> validate -> claim against a real Supabase database
- both authenticated users resolving the same shared household after join
- expired invite -> regenerate -> successful partner join in a live environment

Because of that, the phase is not fully proven operationally in this session.

## Final Status

**Passed-with-gaps**

Why:

- The shipped code satisfies the Phase 2 goal and the mapped requirements `HOUS-01`, `HOUS-02`, and `HOUS-03` on static inspection.
- The membership lifecycle rules that matter to downstream phases are enforced at the database boundary.
- Fresh lint and typecheck passed.
- However, the included DB verification script contains at least one assertion that no longer matches the shipped contract, and I could not run live DB/browser verification here.

Recommended next step before archiving Phase 2:

- Rerun `supabase/verify/phase-2-household-onboarding.sql` against an applied Phase 2 database and complete the documented two-session manual flow.
