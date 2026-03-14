-- Phase 2 household onboarding verification
-- Run after applying the Phase 2 migration against a disposable local or linked Supabase database.
--
-- Required psql variables:
--   - owner_user_id
--   - partner_user_id
--   - third_user_id
--
-- Example:
--   psql "$SUPABASE_DB_URL" \
--     -v owner_user_id='00000000-0000-0000-0000-000000000001' \
--     -v partner_user_id='00000000-0000-0000-0000-000000000002' \
--     -v third_user_id='00000000-0000-0000-0000-000000000003' \
--     -f supabase/verify/phase-2-household-onboarding.sql
--
-- Use disposable auth users only. The script deletes prior phase2 verification rows
-- tied to the generated household names for reruns.

\echo '=== Phase 2: setup ==='

CREATE TEMP TABLE phase2_assertions (
  label TEXT NOT NULL,
  actual TEXT NOT NULL,
  expected TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  details TEXT
);

DELETE FROM public.household_invites
WHERE household_id IN (
  SELECT id
  FROM public.households
  WHERE name IN ('phase2 verify: household one', 'phase2 verify: household two')
);

DELETE FROM public.household_members
WHERE household_id IN (
  SELECT id
  FROM public.households
  WHERE name IN ('phase2 verify: household one', 'phase2 verify: household two')
);

DELETE FROM public.households
WHERE name IN ('phase2 verify: household one', 'phase2 verify: household two');

SELECT set_config('request.jwt.claim.role', 'authenticated', false);

\echo '=== Phase 2: owner bootstrap + extra invite ==='
SELECT set_config('request.jwt.claim.sub', :'owner_user_id', false);

SELECT *
FROM public.create_household('phase2 verify: household one', 'Owner One', 24)
\gset owner_create_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'owner create household',
  :'owner_create_status',
  'success',
  :'owner_create_status' = 'success',
  COALESCE(:'owner_create_invite_code', '')
);

SELECT *
FROM public.regenerate_household_invite(:'owner_create_household_id'::UUID, 24)
\gset owner_regen_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'owner regenerate while slot is open',
  :'owner_regen_status',
  'success',
  :'owner_regen_status' = 'success',
  COALESCE(:'owner_regen_invite_code', '')
);

\echo '=== Phase 2: partner preview + claim ==='
SELECT set_config('request.jwt.claim.sub', :'partner_user_id', false);

SELECT *
FROM public.validate_invite_code(:'owner_create_invite_code')
\gset partner_validate_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES
  (
    'partner validate invite status',
    :'partner_validate_status',
    'valid',
    :'partner_validate_status' = 'valid',
    NULL
  ),
  (
    'partner validate creator display name',
    COALESCE(:'partner_validate_creator_display_name', ''),
    'Owner One',
    COALESCE(:'partner_validate_creator_display_name', '') = 'Owner One',
    NULL
  ),
  (
    'partner validate member count',
    :'partner_validate_member_count',
    '1',
    :'partner_validate_member_count' = '1',
    NULL
  );

SELECT *
FROM public.claim_invite(:'owner_create_invite_code', 'Partner Two')
\gset partner_claim_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'partner claim invite',
  :'partner_claim_status',
  'success',
  :'partner_claim_status' = 'success',
  NULL
);

\echo '=== Phase 2: full household + used invite protection ==='
SELECT set_config('request.jwt.claim.sub', :'third_user_id', false);

SELECT *
FROM public.validate_invite_code(:'owner_regen_invite_code')
\gset third_validate_full_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'third user sees full household before claim',
  :'third_validate_full_status',
  'household_full',
  :'third_validate_full_status' = 'household_full',
  NULL
);

SELECT *
FROM public.claim_invite(:'owner_regen_invite_code', 'Third User')
\gset third_claim_full_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'third user cannot claim into full household',
  :'third_claim_full_status',
  'household_full',
  :'third_claim_full_status' = 'household_full',
  NULL
);

SELECT *
FROM public.claim_invite(:'owner_create_invite_code', 'Third User')
\gset third_claim_used_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'used invite stays used after claim',
  :'third_claim_used_status',
  'invite_used',
  :'third_claim_used_status' = 'invite_used',
  NULL
);

SELECT set_config('request.jwt.claim.sub', :'owner_user_id', false);

SELECT *
FROM public.regenerate_household_invite(:'owner_create_household_id'::UUID, 24)
\gset owner_regen_full_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'owner cannot regenerate invite once household is full',
  :'owner_regen_full_status',
  'household_full',
  :'owner_regen_full_status' = 'household_full',
  NULL
);

\echo '=== Phase 2: second household + duplicate membership denial ==='
SELECT set_config('request.jwt.claim.sub', :'third_user_id', false);

SELECT *
FROM public.create_household('phase2 verify: household two', 'Third Owner', 24)
\gset third_create_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'third user creates second verification household',
  :'third_create_status',
  'success',
  :'third_create_status' = 'success',
  COALESCE(:'third_create_invite_code', '')
);

SELECT *
FROM public.create_household('phase2 verify: household two', 'Third Owner', 24)
\gset third_duplicate_create_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'member cannot create another household',
  :'third_duplicate_create_status',
  'already_in_household',
  :'third_duplicate_create_status' = 'already_in_household',
  NULL
);

\echo '=== Phase 2: expire + regenerate invite lifecycle ==='
UPDATE public.household_invites
SET expires_at = NOW() - INTERVAL '1 hour'
WHERE code = :'third_create_invite_code';

SELECT set_config('request.jwt.claim.sub', :'owner_user_id', false);

SELECT *
FROM public.validate_invite_code(:'third_create_invite_code')
\gset expired_validate_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'expired invite validates as expired',
  :'expired_validate_status',
  'invite_expired',
  :'expired_validate_status' = 'invite_expired',
  NULL
);

SELECT set_config('request.jwt.claim.sub', :'third_user_id', false);

SELECT *
FROM public.regenerate_household_invite(:'third_create_household_id'::UUID, 24)
\gset third_regen_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'owner regenerates expired invite',
  :'third_regen_status',
  'success',
  :'third_regen_status' = 'success',
  COALESCE(:'third_regen_invite_code', '')
);

SELECT
  COUNT(*) FILTER (
    WHERE code = :'third_create_invite_code'
      AND expires_at <= NOW()
      AND used_at IS NULL
  ) AS expired_count,
  COUNT(*) FILTER (
    WHERE code = :'third_regen_invite_code'
      AND expires_at > NOW()
      AND used_at IS NULL
  ) AS active_count
FROM public.household_invites
WHERE household_id = :'third_create_household_id'::UUID
\gset lifecycle_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES
  (
    'expired invite row is preserved after regeneration',
    :'lifecycle_expired_count',
    '1',
    :'lifecycle_expired_count' = '1',
    NULL
  ),
  (
    'regenerated invite row is active',
    :'lifecycle_active_count',
    '1',
    :'lifecycle_active_count' = '1',
    NULL
  );

\echo '=== Phase 2: already-in-household claim denial ==='
SELECT set_config('request.jwt.claim.sub', :'partner_user_id', false);

SELECT *
FROM public.validate_invite_code(:'third_regen_invite_code')
\gset partner_validate_second_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'existing member preview is blocked from second household',
  :'partner_validate_second_status',
  'already_in_household',
  :'partner_validate_second_status' = 'already_in_household',
  NULL
);

SELECT *
FROM public.claim_invite(:'third_regen_invite_code', 'Partner Two')
\gset partner_claim_second_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'existing member cannot claim second household invite',
  :'partner_claim_second_status',
  'already_in_household',
  :'partner_claim_second_status' = 'already_in_household',
  NULL
);

\echo '=== Phase 2: bounded duplicate-code retry contract exists ==='
SELECT
  (
    pg_get_functiondef(
      'public.insert_household_invite_with_retry(uuid, uuid, timestamp with time zone)'::regprocedure
    ) LIKE '%v_attempts < 8%'
    AND pg_get_functiondef(
      'public.insert_household_invite_with_retry(uuid, uuid, timestamp with time zone)'::regprocedure
    ) LIKE '%household_invites_code_key%'
  )::TEXT AS has_bounded_retry
\gset retry_contract_

INSERT INTO phase2_assertions (label, actual, expected, passed, details)
VALUES (
  'invite retry helper has bounded collision handling',
  :'retry_contract_has_bounded_retry',
  'true',
  :'retry_contract_has_bounded_retry' = 'true',
  NULL
);

\echo '=== Phase 2: assertion summary ==='
TABLE phase2_assertions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM phase2_assertions
    WHERE NOT passed
  ) THEN
    RAISE EXCEPTION 'Phase 2 household onboarding verification failed';
  END IF;
END;
$$;
