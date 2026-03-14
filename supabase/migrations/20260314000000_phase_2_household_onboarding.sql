-- Phase 2 household onboarding hardening.
-- Task 1: enforce single-household membership in v1 and persist household ownership.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT user_id
      FROM public.household_members
      GROUP BY user_id
      HAVING COUNT(*) > 1
    ) duplicate_memberships
  ) THEN
    RAISE EXCEPTION
      'Cannot apply Phase 2 household onboarding migration: duplicate household_members rows exist for one or more users.';
  END IF;
END;
$$;

ALTER TABLE public.households
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.households
ALTER COLUMN owner_user_id SET DEFAULT auth.uid();

WITH household_owners AS (
  SELECT DISTINCT ON (hm.household_id)
    hm.household_id,
    hm.user_id
  FROM public.household_members hm
  ORDER BY hm.household_id, hm.joined_at ASC, hm.id ASC
)
UPDATE public.households h
SET owner_user_id = ho.user_id
FROM household_owners ho
WHERE h.id = ho.household_id
  AND h.owner_user_id IS NULL;

ALTER TABLE public.households
ALTER COLUMN owner_user_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_households_owner_user_id
ON public.households(owner_user_id);

ALTER TABLE public.household_members
ADD CONSTRAINT household_members_user_id_key UNIQUE (user_id);

CREATE OR REPLACE FUNCTION public.generate_household_invite_code()
RETURNS TEXT
LANGUAGE SQL
VOLATILE
SET search_path = ''
AS $$
  SELECT SUBSTRING(UPPER(REPLACE(extensions.uuid_generate_v4()::text, '-', '')) FROM 1 FOR 6);
$$;

CREATE OR REPLACE FUNCTION public.insert_household_invite_with_retry(
  p_household_id UUID,
  p_created_by UUID,
  p_expires_at TIMESTAMPTZ
)
RETURNS TABLE (
  invite_id UUID,
  code TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempts INTEGER := 0;
  v_code TEXT;
  v_constraint_name TEXT;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    v_code := public.generate_household_invite_code();

    BEGIN
      RETURN QUERY
      INSERT INTO public.household_invites (household_id, code, created_by, expires_at)
      VALUES (p_household_id, v_code, p_created_by, p_expires_at)
      RETURNING id, code, expires_at;
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

        IF v_constraint_name = 'household_invites_code_key' AND v_attempts < 8 THEN
          CONTINUE;
        END IF;

        IF v_constraint_name = 'household_invites_code_key' THEN
          RAISE EXCEPTION 'invite_generation_failed';
        END IF;

        RAISE;
    END;
  END LOOP;
END;
$$;

DROP FUNCTION IF EXISTS public.validate_invite_code(TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code TEXT)
RETURNS TABLE (
  status TEXT,
  household_id UUID,
  household_name TEXT,
  creator_display_name TEXT,
  member_count INTEGER,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN,
  is_full BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_invite RECORD;
  v_member_count INTEGER := 0;
  v_status TEXT := 'invalid_invite';
BEGIN
  SELECT
    hi.id,
    hi.household_id,
    hi.expires_at,
    hi.used_at,
    h.name AS household_name,
    owner_member.display_name AS creator_display_name
  INTO v_invite
  FROM public.household_invites hi
  JOIN public.households h
    ON h.id = hi.household_id
  LEFT JOIN public.household_members owner_member
    ON owner_member.household_id = h.id
   AND owner_member.user_id = h.owner_user_id
  WHERE hi.code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      'invalid_invite'::TEXT,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      0,
      NULL::TIMESTAMPTZ,
      FALSE,
      FALSE;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_member_count
  FROM public.household_members hm
  WHERE hm.household_id = v_invite.household_id;

  IF v_invite.used_at IS NOT NULL THEN
    v_status := 'invite_used';
  ELSIF v_invite.expires_at <= NOW() THEN
    v_status := 'invite_expired';
  ELSIF v_uid IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.user_id = v_uid
  ) THEN
    v_status := 'already_in_household';
  ELSIF v_member_count >= 2 THEN
    v_status := 'household_full';
  ELSE
    v_status := 'valid';
  END IF;

  RETURN QUERY
  SELECT
    v_status,
    v_invite.household_id,
    v_invite.household_name,
    COALESCE(v_invite.creator_display_name, '夥伴'),
    v_member_count,
    v_invite.expires_at,
    (v_status = 'valid'),
    (v_member_count >= 2);
END;
$$;

DROP FUNCTION IF EXISTS public.claim_invite(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.claim_invite(p_code TEXT, p_display_name TEXT)
RETURNS TABLE (
  status TEXT,
  household_id UUID,
  household_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite RECORD;
  v_uid UUID := auth.uid();
  v_member_count INTEGER := 0;
  v_display_name TEXT := NULLIF(BTRIM(p_display_name), '');
  v_constraint_name TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY
    SELECT 'not_authenticated'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_display_name IS NULL THEN
    RETURN QUERY
    SELECT 'invalid_display_name'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  SELECT
    hi.id,
    hi.household_id,
    hi.expires_at,
    hi.used_at,
    h.name AS household_name
  INTO v_invite
  FROM public.household_invites hi
  JOIN public.households h
    ON h.id = hi.household_id
  WHERE hi.code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 'invalid_invite'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RETURN QUERY
    SELECT 'invite_used'::TEXT, v_invite.household_id, v_invite.household_name;
    RETURN;
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    RETURN QUERY
    SELECT 'invite_expired'::TEXT, v_invite.household_id, v_invite.household_name;
    RETURN;
  END IF;

  PERFORM 1
  FROM public.households
  WHERE id = v_invite.household_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.household_members hm
    WHERE hm.user_id = v_uid
  ) THEN
    RETURN QUERY
    SELECT 'already_in_household'::TEXT, v_invite.household_id, v_invite.household_name;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_member_count
  FROM public.household_members hm
  WHERE hm.household_id = v_invite.household_id;

  IF v_member_count >= 2 THEN
    RETURN QUERY
    SELECT 'household_full'::TEXT, v_invite.household_id, v_invite.household_name;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.household_members (household_id, user_id, display_name)
    VALUES (v_invite.household_id, v_uid, v_display_name);
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

      IF v_constraint_name = 'household_members_user_id_key' THEN
        RETURN QUERY
        SELECT 'already_in_household'::TEXT, v_invite.household_id, v_invite.household_name;
        RETURN;
      END IF;

      RAISE;
  END;

  UPDATE public.household_invites
  SET used_by = v_uid,
      used_at = NOW()
  WHERE id = v_invite.id;

  RETURN QUERY
  SELECT 'success'::TEXT, v_invite.household_id, v_invite.household_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_household(
  p_household_name TEXT,
  p_display_name TEXT,
  p_invite_expiry_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  status TEXT,
  household_id UUID,
  household_name TEXT,
  invite_code TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_household_name TEXT := NULLIF(BTRIM(p_household_name), '');
  v_display_name TEXT := NULLIF(BTRIM(p_display_name), '');
  v_household public.households%ROWTYPE;
  v_invite RECORD;
  v_constraint_name TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY
    SELECT 'not_authenticated'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_household_name IS NULL THEN
    RETURN QUERY
    SELECT 'invalid_household_name'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF p_invite_expiry_hours IS NULL OR p_invite_expiry_hours < 1 OR p_invite_expiry_hours > 168 THEN
    RETURN QUERY
    SELECT 'invalid_invite_expiry'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.households (name, owner_user_id)
    VALUES (v_household_name, v_uid)
    RETURNING *
    INTO v_household;

    INSERT INTO public.household_members (household_id, user_id, display_name)
    VALUES (v_household.id, v_uid, COALESCE(v_display_name, 'Member'));

    SELECT *
    INTO v_invite
    FROM public.insert_household_invite_with_retry(
      v_household.id,
      v_uid,
      NOW() + MAKE_INTERVAL(hours => p_invite_expiry_hours)
    );
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

      IF v_constraint_name = 'household_members_user_id_key' THEN
        RETURN QUERY
        SELECT 'already_in_household'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
      END IF;

      RAISE;
    WHEN OTHERS THEN
      IF SQLERRM = 'invite_generation_failed' THEN
        RETURN QUERY
        SELECT 'invite_generation_failed'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
        RETURN;
      END IF;

      RAISE;
  END;

  RETURN QUERY
  SELECT 'success'::TEXT, v_household.id, v_household.name, v_invite.code, v_invite.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_household_invite(
  p_household_id UUID,
  p_invite_expiry_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  status TEXT,
  household_id UUID,
  household_name TEXT,
  invite_code TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_household public.households%ROWTYPE;
  v_existing_invite public.household_invites%ROWTYPE;
  v_invite RECORD;
  v_member_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY
    SELECT 'not_authenticated'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF p_invite_expiry_hours IS NULL OR p_invite_expiry_hours < 1 OR p_invite_expiry_hours > 168 THEN
    RETURN QUERY
    SELECT 'invalid_invite_expiry'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT *
  INTO v_household
  FROM public.households
  WHERE id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 'household_not_found'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  IF v_household.owner_user_id <> v_uid THEN
    RETURN QUERY
    SELECT 'not_owner'::TEXT, v_household.id, v_household.name, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_member_count
  FROM public.household_members hm
  WHERE hm.household_id = v_household.id;

  IF v_member_count >= 2 THEN
    RETURN QUERY
    SELECT 'household_full'::TEXT, v_household.id, v_household.name, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT *
  INTO v_existing_invite
  FROM public.household_invites hi
  WHERE hi.household_id = v_household.id
    AND hi.used_at IS NULL
  ORDER BY hi.created_at DESC
  LIMIT 1;

  IF FOUND AND v_existing_invite.expires_at > NOW() THEN
    RETURN QUERY
    SELECT
      'active_invite_exists'::TEXT,
      v_household.id,
      v_household.name,
      v_existing_invite.code,
      v_existing_invite.expires_at;
    RETURN;
  END IF;

  BEGIN
    SELECT *
    INTO v_invite
    FROM public.insert_household_invite_with_retry(
      v_household.id,
      v_uid,
      NOW() + MAKE_INTERVAL(hours => p_invite_expiry_hours)
    );
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM = 'invite_generation_failed' THEN
        RETURN QUERY
        SELECT
          'invite_generation_failed'::TEXT,
          v_household.id,
          v_household.name,
          NULL::TEXT,
          NULL::TIMESTAMPTZ;
        RETURN;
      END IF;

      RAISE;
  END;

  RETURN QUERY
  SELECT 'success'::TEXT, v_household.id, v_household.name, v_invite.code, v_invite.expires_at;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_household_invite_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_household_invite_with_retry(UUID, UUID, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_household(TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_invite(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.regenerate_household_invite(UUID, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_household_invite(UUID, INTEGER) TO authenticated;
