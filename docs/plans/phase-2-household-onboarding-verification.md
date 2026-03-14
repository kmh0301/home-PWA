# Phase 2 Household Onboarding Verification

## Purpose

This runbook re-verifies the full Phase 2 household onboarding slice:

- HOUS-01: one signed-in partner can create a household and receive a shareable invite
- HOUS-02: the second signed-in partner can validate, claim, and join the same household
- HOUS-03: both users continue inside the same household scope after join and account setup

Use this after any Phase 2 onboarding change and before treating the create/share/join flow as stable.

## Static Checks

Run these from the repo root:

```bash
npm run lint
npx tsc --noEmit
```

Expected result:

- both commands pass

## Database Verification

Run the Phase 2 SQL verification against a disposable local or linked Supabase database:

```bash
psql "$SUPABASE_DB_URL" \
  -v owner_user_id='<owner-auth-user-uuid>' \
  -v partner_user_id='<partner-auth-user-uuid>' \
  -v third_user_id='<third-auth-user-uuid>' \
  -f supabase/verify/phase-2-household-onboarding.sql
```

Expected result:

- household creation succeeds with one active invite
- invite validation returns creator display name and member count
- a valid claim succeeds once and marks the invite as used
- full-household, already-in-household, used-invite, and expired-invite checks all return the expected status
- expired invite regeneration leaves the old row preserved and creates one new active invite row

This database pass is the main invariant proof for HOUS-01, HOUS-02, and the expiry-to-regenerate lifecycle.

## Local Route And UI Checks

Start the app locally:

```bash
npm run dev
```

Use two separate authenticated browser sessions:

- Session A: the household creator
- Session B: the invited partner

### Session A: create + share

1. Sign in as Session A and open `/onboarding/create`.
2. Create a household with a fresh Traditional Chinese name.
3. Confirm the success card shows:
   - household name
   - a prominent 6-character invite code
   - explicit expiry time
   - copy and native share actions
   - regenerate guidance for expired invites
4. Trigger copy/share and confirm the handoff text mentions the invite code and expiry instead of generic workspace language.

### Session B: validate + claim

1. Sign in as Session B and open `/onboarding/join`.
2. Enter an invalid code and confirm the error copy is direct and user-safe.
3. Enter Session A's valid code and confirm the preview shows:
   - household name
   - creator display name
   - current member count
   - invite expiry
   - prefilled but editable display name
4. Confirm the claim action sends Session B to `/onboarding/join/success`.
5. Confirm the success screen reads as a milestone, not an abrupt redirect, and continues to `/onboarding/accounts?joined=1`.

### Post-join continuation

1. In Session B, continue into `/onboarding/accounts`.
2. Confirm the joined banner acknowledges household membership without replaying the same success moment.
3. Complete or skip account setup and confirm Session B proceeds into the app.
4. Refresh both Session A and Session B on a protected screen and confirm both remain in the same household scope.

## Failure-State Matrix

Re-check these specific states whenever invite logic or copy changes:

- invalid invite code: join page explains the code is invalid
- expired invite code: join page asks the user to request a fresh code
- used invite code: join page explains the invite has already been used
- full household: validation or claim blocks the third user cleanly
- expired invite regeneration: create page offers a clear regenerate path and the regenerated code can be used successfully by a valid second user

## Evidence To Record

Capture and store:

- `npm run lint` result
- `npx tsc --noEmit` result
- SQL script output from `supabase/verify/phase-2-household-onboarding.sql`
- notes or screenshots for create success, join preview, join success, and accounts continuation
- any blocker that prevented a live two-session authenticated verification

## Phase 2 Exit Criteria

Phase 2 onboarding is ready to treat as complete when:

- lint and typecheck pass
- the SQL verification script passes end-to-end
- the create success surface emphasizes code, expiry, and share/copy actions
- the join flow covers invalid, expired, used, and full invite states with direct HK Traditional Chinese copy
- the expired-invite regenerate path is verified from creation through successful partner join
- both authenticated sessions remain in the same household scope after claim and continuation
