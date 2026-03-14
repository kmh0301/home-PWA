-- Phase 1 foundation baseline for auth and household isolation.
-- Scope is intentionally limited to the tables and RPCs needed by onboarding
-- and current-household resolution.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE household_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  notification_prefs JSONB NOT NULL DEFAULT '{
    "chore_reminder": true,
    "partner_completed": true,
    "shared_task_waiting": true,
    "settlement_reminder": true
  }',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);

CREATE OR REPLACE FUNCTION enforce_max_two_household_members()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM public.households
  WHERE id = NEW.household_id
  FOR UPDATE;

  IF (
    SELECT COUNT(*)
    FROM public.household_members
    WHERE household_id = NEW.household_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Household already has 2 members. Multi-member support is deferred to v2+.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER household_max_members_check
  BEFORE INSERT ON household_members
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_two_household_members();

CREATE TABLE household_invites (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_household_invites_code ON household_invites(code);

CREATE TYPE payment_account_type AS ENUM (
  'alipay_hk',
  'payme',
  'cash',
  'credit_card',
  'custom'
);

CREATE TABLE payment_accounts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type payment_account_type NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  credit_limit_cents INTEGER,
  credit_used_cents INTEGER,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_card_fields CHECK (
    type != 'credit_card'
    OR (credit_limit_cents IS NOT NULL AND credit_used_cents IS NOT NULL)
  ),
  CONSTRAINT credit_card_usage_within_limit CHECK (
    type != 'credit_card'
    OR (credit_used_cents >= 0 AND credit_used_cents <= credit_limit_cents)
  ),
  CONSTRAINT non_credit_balance_non_negative CHECK (
    type = 'credit_card' OR balance_cents >= 0
  )
);

CREATE INDEX idx_payment_accounts_household_id ON payment_accounts(household_id);
CREATE INDEX idx_payment_accounts_user_id ON payment_accounts(user_id);

CREATE TYPE account_event_type AS ENUM (
  'expense',
  'top_up',
  'credit_repayment',
  'refund',
  'transfer_out',
  'transfer_in',
  'settlement_repayment',
  'saving_transfer',
  'manual_adjustment'
);

CREATE TABLE account_events (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES payment_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type account_event_type NOT NULL,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_events_account_id ON account_events(account_id);
CREATE INDEX idx_account_events_household_id ON account_events(household_id);
CREATE INDEX idx_account_events_created_at ON account_events(created_at);

CREATE OR REPLACE FUNCTION get_user_household_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT household_id
  FROM public.household_members
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS TABLE (
  household_id UUID,
  household_name TEXT,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    hi.household_id,
    h.name AS household_name,
    hi.expires_at,
    (hi.used_at IS NULL AND hi.expires_at > NOW()) AS is_valid
  FROM public.household_invites hi
  JOIN public.households h ON h.id = hi.household_id
  WHERE hi.code = p_code;
$$;

CREATE OR REPLACE FUNCTION claim_invite(p_code TEXT, p_display_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite public.household_invites%ROWTYPE;
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.household_invites
  WHERE code = p_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code already used';
  END IF;

  IF v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Invite code expired';
  END IF;

  PERFORM 1
  FROM public.households
  WHERE id = v_invite.household_id
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = v_invite.household_id
      AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Already a member of this household';
  END IF;

  IF (
    SELECT COUNT(*)
    FROM public.household_members
    WHERE household_id = v_invite.household_id
  ) >= 2 THEN
    RAISE EXCEPTION 'Household already has 2 members';
  END IF;

  UPDATE public.household_invites
  SET used_by = v_uid,
      used_at = NOW()
  WHERE id = v_invite.id;

  INSERT INTO public.household_members (household_id, user_id, display_name)
  VALUES (v_invite.household_id, v_uid, p_display_name);

  RETURN v_invite.household_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_manual_adjustment(
  p_household_id UUID,
  p_account_id UUID,
  p_new_balance_cents INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_account public.payment_accounts%ROWTYPE;
  v_delta INTEGER;
BEGIN
  SELECT *
  INTO v_account
  FROM public.payment_accounts
  WHERE id = p_account_id
    AND user_id = v_uid
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or not owned by you in this household';
  END IF;

  IF v_account.type = 'credit_card' THEN
    RAISE EXCEPTION 'Manual adjustment not supported for credit card accounts; adjust credit_used_cents via credit repayment';
  END IF;

  IF p_new_balance_cents < 0 THEN
    RAISE EXCEPTION 'New balance cannot be negative';
  END IF;

  v_delta := p_new_balance_cents - v_account.balance_cents;

  UPDATE public.payment_accounts
  SET balance_cents = p_new_balance_cents,
      updated_at = NOW()
  WHERE id = p_account_id;

  INSERT INTO public.account_events (
    household_id,
    account_id,
    user_id,
    event_type,
    amount_cents,
    balance_after_cents,
    note
  )
  VALUES (
    p_household_id,
    p_account_id,
    v_uid,
    'manual_adjustment',
    v_delta,
    p_new_balance_cents,
    p_note
  );
END;
$$;

CREATE OR REPLACE FUNCTION set_credit_card_used_balance(
  p_household_id UUID,
  p_account_id UUID,
  p_credit_used_cents INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_account public.payment_accounts%ROWTYPE;
  v_delta INTEGER;
BEGIN
  SELECT *
  INTO v_account
  FROM public.payment_accounts
  WHERE id = p_account_id
    AND user_id = v_uid
    AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or not owned by you in this household';
  END IF;

  IF v_account.type != 'credit_card' THEN
    RAISE EXCEPTION 'set_credit_card_used_balance only applies to credit_card accounts; use record_manual_adjustment for cash/debit';
  END IF;

  IF p_credit_used_cents < 0 THEN
    RAISE EXCEPTION 'credit_used_cents cannot be negative';
  END IF;

  IF p_credit_used_cents > v_account.credit_limit_cents THEN
    RAISE EXCEPTION 'credit_used_cents (%) exceeds credit_limit_cents (%)',
      p_credit_used_cents,
      v_account.credit_limit_cents;
  END IF;

  v_delta := p_credit_used_cents - v_account.credit_used_cents;

  UPDATE public.payment_accounts
  SET credit_used_cents = p_credit_used_cents,
      updated_at = NOW()
  WHERE id = p_account_id;

  INSERT INTO public.account_events (
    household_id,
    account_id,
    user_id,
    event_type,
    amount_cents,
    balance_after_cents,
    note
  )
  VALUES (
    p_household_id,
    p_account_id,
    v_uid,
    'manual_adjustment',
    v_delta,
    v_account.credit_limit_cents - p_credit_used_cents,
    p_note
  );
END;
$$;

REVOKE ALL ON FUNCTION get_user_household_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_invite_code(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_invite(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_manual_adjustment(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_credit_card_used_balance(UUID, UUID, INTEGER, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION get_user_household_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION claim_invite(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_manual_adjustment(UUID, UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION set_credit_card_used_balance(UUID, UUID, INTEGER, TEXT) TO authenticated;

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY households_select ON households
  FOR SELECT
  USING (id IN (SELECT get_user_household_ids()));

CREATE POLICY households_insert ON households
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY households_update ON households
  FOR UPDATE
  USING (id IN (SELECT get_user_household_ids()));

CREATE POLICY hm_select ON household_members
  FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY hm_insert ON household_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY hm_update ON household_members
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY hi_select ON household_invites
  FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY hi_insert ON household_invites
  FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND created_by = auth.uid()
  );

CREATE POLICY hi_update ON household_invites
  FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY pa_select ON payment_accounts
  FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY pa_insert ON payment_accounts
  FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND user_id = auth.uid()
  );

CREATE POLICY pa_update ON payment_accounts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND user_id = auth.uid()
  );

CREATE POLICY pa_delete ON payment_accounts
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY ae_select ON account_events
  FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));
