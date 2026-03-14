---
phase: 02-household-onboarding-and-shared-membership
plan: 01
subsystem: database
tags: [supabase, postgres, rpc, onboarding, household]
requires:
  - phase: 01-secure-foundation-and-household-boundary
    provides: household tables, invite RPC baseline, onboarding auth/session boundary
provides:
  - single-household membership enforcement at the database boundary
  - atomic household bootstrap and invite regeneration RPCs
  - stable onboarding server-action error categories in Traditional Chinese
  - rerunnable Phase 2 household onboarding verification SQL
affects: [onboarding, routing, household-state, payment-setup]
tech-stack:
  added: []
  patterns: [database-owned onboarding lifecycle, status-based RPC responses, owner-authorized invite regeneration]
key-files:
  created:
    - supabase/migrations/20260314000000_phase_2_household_onboarding.sql
    - supabase/verify/phase-2-household-onboarding.sql
  modified:
    - src/app/onboarding/actions.ts
    - src/lib/household/current-household.ts
    - src/types/database.types.ts
    - .planning/STATE.md
key-decisions:
  - "Household ownership is persisted on households.owner_user_id so invite regeneration can be authorized deterministically."
  - "Expected onboarding failures return structured status rows from RPCs instead of leaking raw database errors to server actions."
  - "Invite generation retries bounded code collisions in-database before surfacing a generic failure category."
patterns-established:
  - "Onboarding mutations use SECURITY DEFINER RPCs with one-row status payloads rather than client-side multi-write orchestration."
  - "Current household resolution relies on a database-enforced unique user membership invariant."
requirements-completed: [HOUS-01, HOUS-02, HOUS-03]
duration: 8min
completed: 2026-03-14
---

# Phase 2 Plan 02-01 Summary

**Supabase now owns the household onboarding lifecycle with atomic bootstrap, collision-safe invite generation, owner-gated regeneration, and single-household membership enforcement**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-14T13:13:57+08:00
- **Completed:** 2026-03-14T13:21:30+08:00
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Enforced the v1 rule that one authenticated user can belong to only one household, while preserving the two-member cap.
- Replaced the ad hoc create/validate/claim flow with status-based RPCs for household creation, invite preview, claim, and regeneration.
- Added a rerunnable verification SQL script covering duplicate membership denial, full household protection, used/expired invite handling, regeneration lifecycle, and bounded collision retry presence.

## Task Commits

1. **Task 1: Enforce v1 household membership invariants in Supabase** - `34fa67b`
2. **Task 2: Replace ad hoc household bootstrap with an atomic server-consumable contract** - `966d076`
3. **Task 3: Add repeatable Phase 2 verification SQL for lifecycle edge cases** - pending in this summary commit

## Files Created/Modified

- `supabase/migrations/20260314000000_phase_2_household_onboarding.sql` - adds ownership, membership uniqueness, atomic onboarding RPCs, and invite retry helpers
- `src/app/onboarding/actions.ts` - consumes the new RPC contract and maps onboarding failures to Traditional Chinese copy
- `src/lib/household/current-household.ts` - expands current membership identity lookup to include `joined_at`
- `src/types/database.types.ts` - reflects the new household ownership field and RPC return shapes
- `supabase/verify/phase-2-household-onboarding.sql` - rerunnable psql verification for household onboarding invariants
- `.planning/STATE.md` - records current Phase 2 position and decisions

## Decisions Made

- Persisted `households.owner_user_id` so owner-only invite regeneration does not rely on ad hoc inference from invite rows.
- Kept expected onboarding errors inside RPC status payloads, which lets server actions stay deterministic and copy-safe.
- Verified bounded duplicate-code handling structurally via `pg_get_functiondef(...)` in the SQL verification script because collision forcing is not practical in a rerunnable test.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added a database default for `households.owner_user_id` during Task 1**

- **Found during:** Task 1 verification
- **Issue:** The new non-null ownership column broke the pre-RPC direct household insert path before Task 2 landed.
- **Fix:** Set the column default to `auth.uid()` and made the generated insert type optional until the create flow was moved to the RPC.
- **Files modified:** `supabase/migrations/20260314000000_phase_2_household_onboarding.sql`, `src/types/database.types.ts`
- **Verification:** `npx tsc --noEmit`
- **Committed in:** `34fa67b`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The deviation was required to keep verification green between Task 1 and Task 2 without changing scope.

## Issues Encountered

- Local Supabase verification could not be executed in this session because Docker was unavailable for `supabase status`, and `supabase db lint` could not reach the local Postgres port.

## User Setup Required

None. To execute the verification SQL, run it against a disposable Supabase database with three existing auth users supplied as `psql` variables.

## Next Phase Readiness

- Household creation, invite preview, claim, and regeneration now have a trustworthy database contract for downstream routing and onboarding UX work.
- The next Phase 2 plan can build join-success routing and UI refinement on top of stable server/database behavior.

---
*Phase: 02-household-onboarding-and-shared-membership*
*Completed: 2026-03-14*
