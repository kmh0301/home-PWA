-- Phase 1 household isolation verification
-- Run after applying the Phase 1 foundation migration against a local or linked Supabase database.
--
-- Purpose:
-- 1. Confirm same-household reads work for the authenticated actor.
-- 2. Confirm foreign-household rows are not returned under RLS.
-- 3. Confirm helper RPCs are present for the onboarding/auth boundary.
--
-- Suggested usage:
--   1. Seed two users and two households.
--   2. Add each user to a different household.
--   3. Create one invite + one payment account per household.
--   4. Execute these checks in an authenticated session for user A, then repeat for user B.

\echo '=== Phase 1: helper RPC presence ==='
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'get_user_household_ids',
    'validate_invite_code',
    'claim_invite',
    'record_manual_adjustment',
    'set_credit_card_used_balance'
  )
order by routine_name;

\echo '=== Phase 1: same-household rows are visible ==='
select id, name
from public.households
where id in (select public.get_user_household_ids());

select id, household_id, user_id, display_name
from public.household_members
where household_id in (select public.get_user_household_ids())
order by joined_at;

select id, household_id, code, used_at
from public.household_invites
where household_id in (select public.get_user_household_ids())
order by created_at desc;

select id, household_id, user_id, name, type, is_archived
from public.payment_accounts
where household_id in (select public.get_user_household_ids())
order by created_at desc;

\echo '=== Phase 1: cross-household leakage should be zero rows ==='
-- Replace :foreign_household_id with a household the current authenticated user does NOT belong to.
-- Expected result for each query: 0 rows.
select id, name
from public.households
where id = :'foreign_household_id';

select id, household_id, user_id, display_name
from public.household_members
where household_id = :'foreign_household_id';

select id, household_id, code, used_at
from public.household_invites
where household_id = :'foreign_household_id';

select id, household_id, user_id, name, type
from public.payment_accounts
where household_id = :'foreign_household_id';

\echo '=== Phase 1: current household ids should belong only to the authenticated actor ==='
select public.get_user_household_ids();

\echo '=== Notes ==='
\echo '* If any cross-household query returns rows, HOUS-04 is failing.'
\echo '* If helper RPCs are missing, the Phase 1 migration was not applied completely.'
\echo '* Write the observed results into docs/plans/phase-1-foundation-verification.md when running against a real database.'
