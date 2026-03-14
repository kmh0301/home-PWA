# Phase 2 Research: Household Onboarding And Shared Membership

**Date:** 2026-03-14
**Goal:** Plan Phase 2 against the current codebase, not an abstract greenfield design.

## Current Codebase Baseline

This repo already contains a first-pass onboarding implementation under `src/app/onboarding/*` plus supporting auth and household helpers:

- `createHouseholdAction` creates a household, inserts the creator membership, and inserts one invite code.
- `validateInviteAction` and `claimInviteAction` already use Supabase RPCs for invite validation and invite claiming.
- `getOnboardingState()` and `getNextOnboardingRoute()` already centralize most route decisions.
- `household_members`, `household_invites`, and the invite RPCs already exist in the Phase 0/1 migration.

That means Phase 2 is not primarily about inventing the flow. It is about hardening lifecycle invariants, fixing route/state gaps, aligning the UX to the current phase context, and making the database/API surface safe enough for downstream finance/chore phases.

There is also a phase-numbering mismatch to keep in mind while planning:

- The roadmap treats household onboarding/shared membership as **Phase 2**.
- The existing implementation and OpenSpec artifacts describe the same area as a prior **Phase 1 onboarding** change.

Planning should assume the existing onboarding code is the starting point, not something to rebuild from zero.

## Membership Lifecycle Invariants

These invariants should be treated as phase-level requirements, because later finance, chore, and notification records depend on them.

### Must-hold invariants

1. **One authenticated user maps to at most one active household membership in v1.**
   - Current risk: `household_members` only enforces `UNIQUE (household_id, user_id)`.
   - It does **not** enforce `UNIQUE (user_id)`.
   - A user can therefore create or join multiple households over time in the current schema.
   - `getCurrentHousehold()` uses `.maybeSingle()` on `household_members where user_id = ...`; this becomes ambiguous or broken if multiple rows ever exist.

2. **A household can have at most two active members in v1.**
   - Current coverage: enforced both by `enforce_max_two_household_members()` trigger and by an explicit count check inside `claim_invite()`.
   - This is good defense-in-depth and should be preserved.

3. **Membership identity must be created once and then updated in place, not recreated casually.**
   - Current context: `household_members.id` already exists and is exposed by `getCurrentHousehold()`.
   - Even though current finance tables use `user_id`, later phases are likely to need stable household-member identity.
   - Planning should avoid any design that deletes and recreates membership rows as part of invite retries, profile edits, or household join confirmation.

4. **Household creation must not leave orphaned or half-created records.**
   - Current risk: `createHouseholdAction()` performs three separate writes from application code:
     - insert household
     - insert creator membership
     - insert invite
   - If step 2 or 3 fails, the earlier rows remain committed.
   - That creates orphaned households or households with no invite, which complicates retry and later household resolution.

5. **Invite claim is a one-way transition in this phase.**
   - Current code already treats invite claim as one-time via `used_at` / `used_by`.
   - Planning should keep Phase 2 scoped to:
     - create household
     - generate/share invite
     - validate invite
     - claim invite
   - It should explicitly defer leaving, member removal, re-invite-after-removal, and household transfer flows.

### Recommended schema/data hardening

- Add a database-level uniqueness constraint for v1 active membership per user.
  - Simplest version: `UNIQUE (user_id)` on `household_members`.
  - If future v2 needs multiple memberships or archived memberships, design that intentionally later. Do not leave v1 ambiguous.

- Move household bootstrap into a single database transaction boundary.
  - Recommended: add a `create_household_with_invite(...)` RPC that creates household, creator membership, and initial invite atomically.
  - This is better than trying to coordinate three separate app-layer writes.

- Treat membership rows as durable identity records.
  - Update fields like `display_name` in place.
  - Do not design flows that recreate the row for cosmetic reasons.

## Invite Code Flow

## What already exists

- Invite code format is six uppercase alphanumeric characters generated in `generateInviteCode()`.
- Invite validation is done by the `validate_invite_code(p_code)` RPC.
- Invite claim is done by the `claim_invite(p_code, p_display_name)` RPC.
- Invite rows store `created_by`, `expires_at`, `used_by`, and `used_at`.

## Gaps and risks in the current flow

1. **Create flow is not atomic.**
   - The initial invite is created after household + membership creation in app code.
   - Failure leaves partial household state behind.

2. **Invite code collision handling is incomplete.**
   - `household_invites.code` is `UNIQUE`.
   - `generateInviteCode()` does not retry on duplicate-key failure.
   - A rare collision currently becomes a user-facing failure instead of an internal retry.

3. **Validation payload is too thin for the desired UX.**
   - Current RPC returns:
     - `household_id`
     - `household_name`
     - `expires_at`
     - `is_valid`
   - Phase context requires join preview to show:
     - household name
     - creator display name
     - current member count
   - Planner should assume either:
     - extend `validate_invite_code()` to return creator/member metadata, or
     - add a second server-side query after validation.
   - Extending the RPC is cleaner and keeps preview data coherent under one transactionally consistent read.

4. **Validation does not report “full household” up front.**
   - `validate_invite_code()` only checks `used_at` and expiry.
   - A full household still appears valid until `claim_invite()` fails later.
   - That is technically safe but weaker UX.
   - The planner should decide whether preview should include a `can_claim` or `member_count` signal so “full” can be surfaced before final confirmation.

5. **No refresh/regenerate invite flow yet.**
   - Current create screen shows the one invite created during bootstrap.
   - There is no action to create a fresh code after expiry.
   - Since the phase context emphasizes sharing and expiry visibility, a “generate new code” follow-up is likely in scope or at least should be left as an explicit next task seam.

6. **No anti-abuse throttling is visible in the repo.**
   - `validateInviteAction` accepts arbitrary authenticated attempts.
   - This is not necessarily a blocker for the planning phase, but it should be called out as a security/operational concern if the app is exposed publicly.

### Recommended invite flow shape

1. Household creator submits name.
2. Server performs one atomic bootstrap mutation:
   - create household
   - create creator membership
   - create initial invite
3. Create page renders success state with:
   - household name
   - invite code
   - explicit expiry time
   - copy/share actions
4. Joining user enters code.
5. Validation returns preview metadata needed for confirmation.
6. Joining user edits/prefills display name and confirms.
7. Claim RPC locks invite row, verifies capacity + membership uniqueness, creates membership, marks invite used.
8. User lands on a dedicated join-success step before account setup.

## Onboarding UX And State Edge Cases

## Edge cases already visible in the code

1. **Signed-in user without a household cannot actually stay on `/onboarding/join`.**
   - `src/app/onboarding/layout.tsx` derives a pseudo-current pathname as:
     - `/onboarding/create` when no household
     - `/onboarding/accounts` when household exists but account setup is incomplete
     - `/dashboard` otherwise
   - It does not distinguish `/onboarding/create` from `/onboarding/join`.
   - Result: a signed-in, no-household user visiting `/onboarding/join` gets redirected to `/onboarding/create`.
   - This breaks the second-partner join flow after login and is the most important routing issue to plan around.

2. **Join display name is not prefilled.**
   - Phase context explicitly wants it editable but prefilled from profile when available.
   - Current join page leaves the field blank.

3. **Join success page is missing.**
   - `claimInviteAction()` redirects directly to `/onboarding/accounts?joined=1`.
   - Phase context wants a dedicated success page before payment account setup.

4. **Current onboarding copy is mostly English, not Traditional Chinese.**
   - `login/page.tsx` already moved to Traditional Chinese.
   - `onboarding/create`, `onboarding/join`, `accounts`, and `ShareInviteCodeButton` are still English-heavy.
   - Phase planning should treat localization alignment as part of the UX completion work, not a cosmetic afterthought.

5. **Invite share text is generic and omits expiry.**
   - `ShareInviteCodeButton` shares “Use invite code X to join Y.”
   - The phase context wants clearer code handoff and explicit expiry visibility.

6. **Create flow does not block already-onboarded users server-side.**
   - Route guards usually prevent access, but `createHouseholdAction()` itself does not enforce “must not already belong to a household”.
   - Given the missing `UNIQUE (user_id)` constraint, this should not be left to UI routing alone.

7. **Error mapping is raw-database-message oriented.**
   - Current actions often redirect with `error.message`.
   - That is acceptable for scaffolding but not ideal for a polished onboarding flow.
   - Planning should include user-facing error normalization for:
     - invalid code
     - expired code
     - already used code
     - already a member
     - household full
     - create failure

### UX states the plan should explicitly model

- Create household form
- Create success with invite card
- Invite expired / regenerate prompt
- Join code entry
- Join code invalid / expired / full
- Join preview with household metadata
- Join confirmation submission pending
- Join success milestone page
- Continue to account setup

These should be modeled as route states or server-rendered search-param states, not a complex client onboarding store.

## Routing Implications

The existing routing strategy is sound in principle:

- middleware handles coarse auth/session gating
- server route logic handles household/account onboarding state

That should remain the architecture.

### What needs to change

1. **`getNextOnboardingRoute()` is too coarse for the actual phase flow.**
   - It only returns:
     - `/login`
     - `/onboarding/create`
     - `/onboarding/accounts`
     - `/dashboard`
   - Phase 2 now needs at least:
     - `/onboarding/create`
     - `/onboarding/join`
     - `/onboarding/join/success` or equivalent dedicated success route
   - The helper should stay central, but the route model needs to represent more than one “no household” state.

2. **Onboarding layout needs allowlisted subroutes, not one implied route.**
   - For no-household users, both create and join should be valid.
   - For joined-but-not-account-setup users, join-success and accounts may both be valid depending on exact flow design.
   - The current “one canonical pathname per state” approach is too strict for a multi-step onboarding phase.

3. **Auth callback should continue to stay narrow.**
   - Current `src/app/auth/callback/route.ts` only establishes the session and redirects to `next`.
   - That is correct and should not absorb onboarding decisions.
   - The next-step routing should still happen via `/` or the requested onboarding route after auth.

4. **Middleware should remain session-only.**
   - It already redirects unauthenticated users away from protected paths and redirects authenticated users away from `/login`.
   - Do not move household queries into middleware.

### Recommended routing model

- Keep middleware as-is conceptually.
- Expand route-level onboarding state to support **allowed route sets** instead of a single canonical route.
- Example shape:
  - no session: `/login`
  - session + no household: allow `/onboarding/create` and `/onboarding/join`
  - session + just joined + no accounts: allow `/onboarding/join/success` then `/onboarding/accounts`
  - session + household + no account setup: `/onboarding/accounts`
  - session + complete: `/dashboard`

This preserves the server-first pattern while fixing the current join-route breakage.

## Data Model And RLS Concerns

## What is already good

- Household-scoped selects are generally driven by `get_user_household_ids()`.
- Invite insertion is limited to members of the household and `created_by = auth.uid()`.
- Invite claim uses `SECURITY DEFINER` and explicit checks instead of trusting client-supplied household IDs.
- Household two-member capacity is enforced at both trigger and RPC level.

## Planning concerns that should be addressed explicitly

1. **User-to-household uniqueness is not enforced at the database boundary.**
   - This is the biggest data-integrity gap for this phase.
   - Route gating is not sufficient.

2. **Household creation is not transactional.**
   - This is the biggest lifecycle-consistency gap for this phase.

3. **`households_insert` is open to any authenticated user without additional lifecycle guardrails.**
   - That is not inherently wrong, but it assumes application logic will prevent multi-household creation per user.
   - Once `UNIQUE (user_id)` exists, this becomes much safer.

4. **Invite preview data is underpowered for the intended confirmation screen.**
   - Extending the RPC is preferable to ad hoc client-driven joins across multiple tables.

5. **Future member-identity references need a stable contract.**
   - Current downstream finance tables reference `user_id`.
   - Future phases may also want `household_member_id`.
   - The planner should document that Phase 2 must preserve stable membership rows and avoid semantics that would force identity remapping later.

6. **RLS verification currently focuses on isolation, not onboarding mutation edge cases.**
   - `supabase/verify/phase-1-household-isolation.sql` checks visibility and helper RPC presence.
   - It does not verify:
     - duplicate membership attempts
     - multi-household attempt by same user
     - partial household creation behavior
     - invite full-household race behavior

### Recommended DB/API changes before or early in implementation

- Add `UNIQUE (user_id)` to `household_members` for v1.
- Add an atomic household bootstrap RPC.
- Extend `validate_invite_code()` to return:
  - household name
  - creator display name
  - current member count
  - expiry
  - validity
- Add deterministic server-side error mapping for invite claim failures.
- Optionally add invite-regeneration RPC/action if expiry handling is in scope for this phase.

## Testing Risks

The repo currently has lint/format scripts, but no visible automated test harness or test suites for onboarding behavior.

That means Phase 2 planning must not assume tests already exist.

### Highest-risk behaviors to verify

1. **Route decision correctness**
   - unauthenticated user -> `/login`
   - authenticated no-household user -> can access create and join
   - authenticated joined user -> join-success/accounts path as intended
   - completed onboarding -> `/dashboard`

2. **Membership uniqueness**
   - same user cannot create a second household membership
   - same user cannot claim an invite after already joining another household

3. **Two-member race conditions**
   - two users claiming near-simultaneously only allow one second member
   - invite becomes unusable once claim succeeds

4. **Household bootstrap atomicity**
   - failure in invite creation does not leave an orphan household
   - failure in membership creation does not leave inconsistent bootstrap state

5. **Error normalization**
   - invalid / expired / already-used / full-household states map to stable user-facing copy
   - database error strings do not leak directly into polished UI states

6. **Join-route accessibility after auth**
   - a user sent to `/login?next=/onboarding/join` can successfully return to the join flow after auth

### Recommended verification layers

- **Unit tests** for pure route-decision helpers such as `getNextOnboardingRoute()` or its replacement.
- **Server-action tests** for error mapping and redirect behavior around create/validate/claim actions.
- **Database-level verification SQL** for uniqueness, trigger behavior, and invite-claim races.
- **Happy-path manual/UAT pass** for the full two-device or two-session flow because this phase is highly redirect-driven.

If adding a formal test runner is too much for this slice, at minimum the plan should add:

- a reproducible verification SQL script for onboarding edge cases
- a written manual test matrix for create/share/join/account-setup handoff

## Implementation Sequencing

The safest sequence is to lock invariants first, then routing, then UX polish.

### Recommended order

1. **Database and RPC hardening**
   - add single-household-per-user enforcement
   - add atomic household bootstrap mutation
   - extend invite validation payload
   - verify claim behavior still handles full/used/expired cases correctly

2. **Onboarding state and routing refactor**
   - replace the current single-canonical-route logic with allowlisted route sets
   - make `/onboarding/join` reachable for signed-in users without a household
   - introduce dedicated post-join success route/state

3. **Server action updates**
   - switch create flow to atomic RPC or equivalent transaction boundary
   - normalize invite/action errors to stable UI messages
   - prefill join display name from auth profile

4. **UI and copy refinement**
   - convert onboarding flow copy to Traditional Chinese aligned with `/login`
   - update create success card to match the approved tone
   - update share/copy affordances and expiry presentation
   - add the dedicated join-success page

5. **Verification**
   - add route-decision coverage
   - add onboarding SQL verification cases
   - run multi-session manual join flow

This sequence minimizes rework because UI work will otherwise be built against unstable routing and incomplete database contracts.

## Architecture Patterns

- Keep onboarding **server-first**.
- Keep middleware **coarse** and session-focused.
- Keep household-sensitive mutations behind **server actions + RPC/database constraints**, not client-side Supabase writes.
- Prefer **database-enforced invariants** for membership lifecycle rules.
- Prefer **thin shared route helpers** over a client onboarding store.

## Don’t Hand-Roll

- Do not hand-roll household identity by passing `household_id` from the client during join.
- Do not rely on client/UI redirects as the only enforcement for single-household membership.
- Do not keep bootstrap as three unrelated writes if the database can enforce it transactionally.
- Do not move household onboarding state into middleware.
- Do not add a global client store for this phase unless a later requirement proves it necessary.

## Common Pitfalls To Plan Around

- Breaking `/onboarding/join` again by keeping a single canonical no-household route.
- Assuming current RLS policies are enough without `UNIQUE (user_id)`.
- Shipping raw database error strings as user copy.
- Treating invite validation as sufficient proof that claim will succeed under concurrency.
- Adding future-looking membership removal/rejoin flows before the v1 lifecycle is fully locked.

## Planner Checklist

- Define the v1 membership invariant explicitly: one user, one active household membership.
- Decide whether to enforce that invariant with a simple unique constraint now.
- Decide whether household bootstrap becomes a single RPC in this phase.
- Extend invite preview data so the join confirmation can show creator + member count.
- Refactor onboarding route guards so `/onboarding/join` is valid for signed-in users with no household.
- Add a dedicated join-success route before account setup.
- Normalize all onboarding copy to Traditional Chinese.
- Add verification for concurrency and route-decision edge cases.

RESEARCH COMPLETE
