-- ============================================================
-- Home Collaboration PWA — Database Schema
-- Based on PRD v1.14
-- Supabase (PostgreSQL) with Row Level Security
-- All monetary values stored in cents (integer) to avoid float errors
-- All ratios stored in permille (×10, integer) — e.g. 20.0% = 200
-- Timezone: all timestamps stored in UTC; HKT = UTC+8
--
-- HOUSEHOLD SIZE COMMITMENT: This schema is designed for EXACTLY 2-member households
-- (couples). The settlement arithmetic (diff/2) is only correct for 2 members.
-- A DB trigger enforces max 2 members per household.
-- Multi-member family support is explicitly deferred to v2+.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- HOUSEHOLDS
-- ============================================================

CREATE TABLE households (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- HOUSEHOLD MEMBERS
-- ============================================================

CREATE TABLE household_members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        TEXT NOT NULL,
  avatar_url          TEXT,
  notification_prefs  JSONB NOT NULL DEFAULT '{
    "chore_reminder": true,
    "partner_completed": true,
    "shared_task_waiting": true,
    "settlement_reminder": true
  }',
  joined_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_user_id ON household_members(user_id);
CREATE INDEX idx_household_members_household_id ON household_members(household_id);

-- Enforce max 2 members per household (v1 is couples-only; settlement math requires exactly 2).
-- This fires before INSERT, blocking a third member from joining.
-- Concurrency-safe 2-member limit.
-- Acquires a FOR UPDATE lock on the parent households row before counting members.
-- This serializes all concurrent INSERT attempts for the same household:
-- a second concurrent transaction will block on the households row lock until
-- the first commits or rolls back, then re-evaluate the count safely.
-- Without this lock, two concurrent INSERTs could both pass COUNT < 2 and both commit.
CREATE OR REPLACE FUNCTION enforce_max_two_household_members()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Lock the parent household row to serialize concurrent member insertions
  PERFORM 1 FROM public.households WHERE id = NEW.household_id FOR UPDATE;

  IF (SELECT COUNT(*) FROM public.household_members WHERE household_id = NEW.household_id) >= 2 THEN
    RAISE EXCEPTION 'Household already has 2 members. Multi-member support is deferred to v2+.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER household_max_members_check
  BEFORE INSERT ON household_members
  FOR EACH ROW EXECUTE FUNCTION enforce_max_two_household_members();

-- ============================================================
-- HOUSEHOLD INVITES
-- ============================================================

CREATE TABLE household_invites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code          TEXT NOT NULL UNIQUE,                -- 6-char alphanumeric, uppercase
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  expires_at    TIMESTAMPTZ NOT NULL,                -- 24h after creation
  used_by       UUID REFERENCES auth.users(id),
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_household_invites_code ON household_invites(code);

-- ============================================================
-- PAYMENT ACCOUNTS
-- ============================================================

CREATE TYPE payment_account_type AS ENUM (
  'alipay_hk',
  'payme',
  'cash',
  'credit_card',
  'custom'
);

CREATE TABLE payment_accounts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id        UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id),  -- account owner
  name                TEXT NOT NULL,
  type                payment_account_type NOT NULL,
  -- For non-credit accounts: current balance
  balance_cents       INTEGER NOT NULL DEFAULT 0,
  -- For credit card only
  credit_limit_cents  INTEGER,
  credit_used_cents   INTEGER,
  is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credit_card_fields CHECK (
    type != 'credit_card' OR (credit_limit_cents IS NOT NULL AND credit_used_cents IS NOT NULL)
  ),
  -- Credit cards: used cannot exceed limit; non-credit: balance cannot go negative.
  -- These are DB-level invariant guards; RPCs (record_expense etc.) enforce these checks
  -- with friendly error messages before reaching this constraint.
  CONSTRAINT credit_card_usage_within_limit CHECK (
    type != 'credit_card' OR (credit_used_cents >= 0 AND credit_used_cents <= credit_limit_cents)
  ),
  CONSTRAINT non_credit_balance_non_negative CHECK (
    type = 'credit_card' OR balance_cents >= 0
  )
);

CREATE INDEX idx_payment_accounts_household_id ON payment_accounts(household_id);
CREATE INDEX idx_payment_accounts_user_id ON payment_accounts(user_id);

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TYPE expense_type AS ENUM ('personal', 'shared');

CREATE TYPE expense_category AS ENUM (
  'food',
  'home',
  'transport',
  'entertainment',
  'medical',
  'other'
);

CREATE TABLE expenses (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id),      -- who recorded it
  payment_account_id    UUID NOT NULL REFERENCES payment_accounts(id),
  amount_cents          INTEGER NOT NULL CHECK (amount_cents > 0),
  date                  DATE NOT NULL,
  expense_type          expense_type NOT NULL,
  category              expense_category NOT NULL,
  merchant_source       TEXT,                                          -- e.g. "Keeta", "OpenRice"
  summary               TEXT NOT NULL,                                 -- AI-generated; required
  notes                 TEXT,
  attachment_url        TEXT,
  is_duplicate_flagged  BOOLEAN NOT NULL DEFAULT FALSE,
  -- PRD 8.1: shared expense recorded with a date that falls in an already-locked settlement month.
  -- System does NOT retroactively update the locked settlement; instead marks the expense as a
  -- late adjustment item and includes it in the NEXT month's settlement tally.
  is_late_adjustment    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Which settlement absorbs this late-adjustment expense; NULL = not yet absorbed.
  -- Set atomically by finalize_month_settlement() when cron includes this expense in a tally.
  -- Query: WHERE is_late_adjustment = TRUE AND applied_to_settlement_id IS NULL → unabsorbed items.
  applied_to_settlement_id UUID REFERENCES monthly_settlements(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_household_id ON expenses(household_id);
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_expense_type ON expenses(expense_type);
CREATE INDEX idx_expenses_household_date ON expenses(household_id, date);
CREATE INDEX idx_expenses_late_adjustment ON expenses(household_id, is_late_adjustment) WHERE is_late_adjustment = TRUE;

-- ============================================================
-- EXPENSE LINE ITEMS (optional AI breakdown)
-- ============================================================

CREATE TABLE expense_line_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_id    UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  description   TEXT NOT NULL,
  amount_cents  INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expense_line_items_expense_id ON expense_line_items(expense_id);

-- ============================================================
-- ACCOUNT EVENTS (balance ledger — immutable audit log)
-- ============================================================

CREATE TYPE account_event_type AS ENUM (
  'expense',              -- spending recorded
  'top_up',              -- Alipay/PayMe/cash deposit
  'credit_repayment',    -- paying down credit card from another account
  'refund',              -- merchant refund back to account
  'transfer_out',        -- send money to another account
  'transfer_in',         -- receive money from another account
  'settlement_repayment',-- monthly settlement payout
  'saving_transfer',     -- move money into a savings goal pool
  'manual_adjustment'    -- user manually corrects balance
);

CREATE TABLE account_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES payment_accounts(id),
  user_id         UUID NOT NULL REFERENCES auth.users(id),       -- who triggered
  event_type      account_event_type NOT NULL,
  amount_cents    INTEGER NOT NULL,                              -- positive = credit, negative = debit
  balance_after_cents INTEGER NOT NULL,                         -- snapshot for audit
  reference_id    UUID,                                          -- expense_id / settlement_id / etc.
  reference_type  TEXT,                                          -- 'expense' | 'settlement' | 'saving_contribution' | etc.
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_events_account_id ON account_events(account_id);
CREATE INDEX idx_account_events_household_id ON account_events(household_id);
CREATE INDEX idx_account_events_created_at ON account_events(created_at);

-- ============================================================
-- MONTHLY SETTLEMENTS
-- ============================================================

CREATE TYPE settlement_status AS ENUM (
  'calculating',        -- within the month, still accumulating
  'pending_repayment',  -- both confirmed amount; awaiting payment
  'completed',          -- repayment recorded
  'disputed'            -- confirmation timeout → needs both parties
);

CREATE TABLE monthly_settlements (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  year                  SMALLINT NOT NULL,
  month                 SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  status                settlement_status NOT NULL DEFAULT 'calculating',
  -- computed amounts (locked once status moves to pending_repayment)
  payer_user_id         UUID REFERENCES auth.users(id),          -- who owes
  payee_user_id         UUID REFERENCES auth.users(id),          -- who receives
  repayment_amount_cents INTEGER,                                 -- |diff| / 2
  finalized_at          TIMESTAMPTZ,                              -- when cron wrote month-end totals; daily confirmation reminders start immediately from this point
  locked_at             TIMESTAMPTZ,                              -- when both confirmed; amounts frozen
  completed_at          TIMESTAMPTZ,                              -- when repayment recorded
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, year, month)
);

CREATE INDEX idx_monthly_settlements_household_id ON monthly_settlements(household_id);
CREATE INDEX idx_monthly_settlements_status ON monthly_settlements(status);

-- Per-member totals snapshot (written by cron at month end, NOT at record creation)
-- Rows are absent during the month; app computes live tally from expenses on every FI-16 load
-- Cron writes these on 1st of each month for the previous month, then sets finalized_at
CREATE TABLE settlement_member_totals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id   UUID NOT NULL REFERENCES monthly_settlements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  total_paid_cents INTEGER NOT NULL,
  UNIQUE (settlement_id, user_id)
);

-- ============================================================
-- SETTLEMENT CONFIRMATIONS
-- ============================================================

CREATE TABLE settlement_confirmations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id   UUID NOT NULL REFERENCES monthly_settlements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  confirmed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (settlement_id, user_id)              -- prevents double-confirm
);

-- ============================================================
-- SAVING GOALS
-- ============================================================

CREATE TYPE saving_goal_type AS ENUM ('personal', 'shared');

CREATE TABLE saving_goals (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id          UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  target_amount_cents   INTEGER NOT NULL CHECK (target_amount_cents > 0),
  current_amount_cents  INTEGER NOT NULL DEFAULT 0,              -- denormalised; updated on each contribution
  type                  saving_goal_type NOT NULL,
  owner_user_id         UUID REFERENCES auth.users(id),          -- NULL for shared goals; set for personal goals
  notes                 TEXT,
  is_completed          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Enforce semantic consistency: personal goals must have an owner; shared goals must not.
  CONSTRAINT saving_goal_owner_consistency CHECK (
    (type = 'personal' AND owner_user_id IS NOT NULL) OR
    (type = 'shared'   AND owner_user_id IS NULL)
  )
);

CREATE INDEX idx_saving_goals_household_id ON saving_goals(household_id);

-- ============================================================
-- SAVING CONTRIBUTIONS
-- ============================================================

CREATE TABLE saving_contributions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  saving_goal_id    UUID NOT NULL REFERENCES saving_goals(id) ON DELETE CASCADE,
  household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  from_account_id   UUID NOT NULL REFERENCES payment_accounts(id),
  amount_cents      INTEGER NOT NULL CHECK (amount_cents > 0),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saving_contributions_saving_goal_id ON saving_contributions(saving_goal_id);
CREATE INDEX idx_saving_contributions_household_id ON saving_contributions(household_id);

-- ============================================================
-- CHORE TASKS
-- ============================================================

CREATE TYPE chore_task_type AS ENUM ('personal', 'rotation', 'shared');
CREATE TYPE chore_frequency AS ENUM ('daily', 'weekly', 'monthly', 'once');

CREATE TABLE chore_tasks (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  task_type               chore_task_type NOT NULL,
  frequency               chore_frequency NOT NULL,
  -- personal tasks: fixed assignee
  assignee_user_id        UUID REFERENCES auth.users(id),
  -- rotation tasks: first responsible person
  rotation_start_user_id  UUID REFERENCES auth.users(id),
  -- optional reminder (time of day, HKT)
  reminder_time           TIME,
  -- once-off tasks: the specific date this task is due (required when frequency = 'once')
  due_date                DATE,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT personal_task_has_assignee CHECK (
    task_type != 'personal' OR assignee_user_id IS NOT NULL
  ),
  CONSTRAINT rotation_task_has_start CHECK (
    task_type != 'rotation' OR rotation_start_user_id IS NOT NULL
  ),
  CONSTRAINT once_task_has_due_date CHECK (
    frequency != 'once' OR due_date IS NOT NULL
  )
);

CREATE INDEX idx_chore_tasks_household_id ON chore_tasks(household_id);
CREATE INDEX idx_chore_tasks_task_type ON chore_tasks(task_type);

-- ============================================================
-- CHORE COMPLETIONS
-- ============================================================

CREATE TABLE chore_completions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chore_task_id   UUID NOT NULL REFERENCES chore_tasks(id) ON DELETE CASCADE,
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  scheduled_date  DATE NOT NULL,                  -- which occurrence this completes
  completed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- set at tick time; never null
  photo_url       TEXT,                           -- Supabase Storage path; added via UPDATE after tick
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevents duplicate ticks from same user (double-click, offline re-send).
  -- Also enforces: max 1 row per (task, date, user) → shared task state machine holds.
  UNIQUE (chore_task_id, scheduled_date, user_id)
);

-- SHARED TASK COMPLETION MODEL:
-- Each member inserts their own row with completed_at = NOW() when they tick.
-- "waiting_partner" state = exactly 1 row exists for (chore_task_id, scheduled_date)
-- "completed"       state = 2 rows exist  for (chore_task_id, scheduled_date)
-- App infers state via: SELECT COUNT(*) ... GROUP BY chore_task_id, scheduled_date
-- No partial/null rows; photo can be added later via UPDATE on own row (RLS: user_id = auth.uid())

CREATE INDEX idx_chore_completions_chore_task_id ON chore_completions(chore_task_id);
CREATE INDEX idx_chore_completions_scheduled_date ON chore_completions(scheduled_date);
CREATE INDEX idx_chore_completions_household_date ON chore_completions(household_id, scheduled_date);

-- ============================================================
-- MONTHLY PLANS (ratio planning + savings rate)
-- ============================================================

CREATE TYPE plan_scope AS ENUM ('personal', 'household_total');

CREATE TABLE monthly_plans (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  -- user_id is NULL for scope='household_total' (shared plan, no single owner).
  -- user_id is NOT NULL for scope='personal' (each member's own plan).
  user_id                 UUID REFERENCES auth.users(id),
  year                    SMALLINT NOT NULL,
  month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  scope                   plan_scope NOT NULL DEFAULT 'personal',
  monthly_income_cents    INTEGER NOT NULL CHECK (monthly_income_cents > 0),
  -- Savings rate in permille (e.g. 200 = 20.0%); must sum with categories to 1000
  savings_rate_permille   SMALLINT NOT NULL CHECK (savings_rate_permille BETWEEN 0 AND 1000),
  -- Category allocations in permille; all values + savings_rate must sum to 1000 (±1 tolerance)
  food_permille           SMALLINT NOT NULL DEFAULT 0,
  home_permille           SMALLINT NOT NULL DEFAULT 0,
  transport_permille      SMALLINT NOT NULL DEFAULT 0,
  entertainment_permille  SMALLINT NOT NULL DEFAULT 0,
  medical_permille        SMALLINT NOT NULL DEFAULT 0,
  other_permille          SMALLINT NOT NULL DEFAULT 0,
  version                 SMALLINT NOT NULL DEFAULT 1,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,        -- false = historical version
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ratio_sum_valid CHECK (
    savings_rate_permille + food_permille + home_permille + transport_permille +
    entertainment_permille + medical_permille + other_permille BETWEEN 999 AND 1001
  ),
  -- Enforce: personal plans must have an owner; household_total plans must not
  CONSTRAINT plan_scope_user_consistency CHECK (
    (scope = 'personal'        AND user_id IS NOT NULL) OR
    (scope = 'household_total' AND user_id IS NULL)
  )
);

CREATE INDEX idx_monthly_plans_household_id ON monthly_plans(household_id);
CREATE INDEX idx_monthly_plans_user_year_month ON monthly_plans(user_id, year, month);

-- One active personal plan per user per month
CREATE UNIQUE INDEX idx_monthly_plans_personal_active_unique
  ON monthly_plans(household_id, user_id, year, month)
  WHERE scope = 'personal' AND is_active = TRUE;

-- ONE active household_total plan per household per month (user_id IS NULL for this scope)
CREATE UNIQUE INDEX idx_monthly_plans_household_active_unique
  ON monthly_plans(household_id, year, month)
  WHERE scope = 'household_total' AND is_active = TRUE;

-- ============================================================
-- PERSONAL BUDGETS (FI-09 — independent of ratio planning)
-- ============================================================
-- Separate from monthly_plans: this is the simple "$X/month personal spend cap"
-- monthly_plans is the ratio planner; personal_budgets is the daily-available calculator

CREATE TABLE personal_budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  year          SMALLINT NOT NULL,
  month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  budget_cents  INTEGER NOT NULL CHECK (budget_cents > 0),  -- e.g. $4,500 → 450000
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year, month)  -- one budget per user per month
);

CREATE INDEX idx_personal_budgets_user_id ON personal_budgets(user_id);
CREATE INDEX idx_personal_budgets_household_id ON personal_budgets(household_id);

-- ============================================================
-- MONTHLY REVIEWS (snapshot; computed and cached)
-- ============================================================

CREATE TABLE monthly_reviews (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  -- NULL when scope = 'household_total' (household-level snapshot, not per-user).
  -- NOT NULL when scope = 'personal' (one row per user per month).
  -- Storing household_total per-user would duplicate identical data and create consistency risk.
  user_id                 UUID REFERENCES auth.users(id),
  year                    SMALLINT NOT NULL,
  month                   SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  scope                   plan_scope NOT NULL,
  total_spent_cents       INTEGER NOT NULL,
  -- Actual amounts per category
  food_cents              INTEGER NOT NULL DEFAULT 0,
  home_cents              INTEGER NOT NULL DEFAULT 0,
  transport_cents         INTEGER NOT NULL DEFAULT 0,
  entertainment_cents     INTEGER NOT NULL DEFAULT 0,
  medical_cents           INTEGER NOT NULL DEFAULT 0,
  other_cents             INTEGER NOT NULL DEFAULT 0,
  shared_total_cents      INTEGER NOT NULL DEFAULT 0,           -- for household_total scope
  savings_rate_permille   SMALLINT,                             -- actual savings rate
  plan_id                 UUID REFERENCES monthly_plans(id),    -- which plan was active
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scope_user_consistency CHECK (
    (scope = 'personal'        AND user_id IS NOT NULL) OR
    (scope = 'household_total' AND user_id IS NULL)
  )
);

-- Partial unique indexes enforce correct uniqueness per scope:
-- personal scope: one row per user per month
CREATE UNIQUE INDEX idx_monthly_reviews_personal_unique
  ON monthly_reviews(household_id, user_id, year, month)
  WHERE scope = 'personal';

-- household_total scope: one row per household per month (user_id is NULL)
CREATE UNIQUE INDEX idx_monthly_reviews_household_unique
  ON monthly_reviews(household_id, year, month)
  WHERE scope = 'household_total';

CREATE INDEX idx_monthly_reviews_household_id ON monthly_reviews(household_id);
CREATE INDEX idx_monthly_reviews_user_year ON monthly_reviews(user_id, year, month);

-- ============================================================
-- AI MONTHLY RECOMMENDATIONS
-- ============================================================

CREATE TYPE ai_confidence AS ENUM ('high', 'medium', 'low');

CREATE TABLE ai_monthly_recommendations (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id                UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id                     UUID NOT NULL REFERENCES auth.users(id),
  -- Month being analysed (i.e. previous month relative to generation date)
  year                        SMALLINT NOT NULL,
  month                       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  summary_text                TEXT NOT NULL,
  -- Array of recommendation objects:
  -- [{category, current_ratio_permille, target_ratio_permille, issue, suggestion,
  --   expected_impact, confidence, scope, data_points[]}]
  recommendations             JSONB NOT NULL DEFAULT '[]',
  suggested_savings_rate_permille SMALLINT,
  model_version               TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
  is_latest                   BOOLEAN NOT NULL DEFAULT TRUE,
  generated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_recommendations_household_id ON ai_monthly_recommendations(household_id);
CREATE INDEX idx_ai_recommendations_user_year_month ON ai_monthly_recommendations(user_id, year, month);

-- Only one "latest" recommendation per user per month
CREATE UNIQUE INDEX idx_ai_recommendations_latest_unique
  ON ai_monthly_recommendations(user_id, year, month)
  WHERE is_latest = TRUE;

-- ============================================================
-- PUSH SUBSCRIPTIONS (for Web Push / PWA notifications)
-- ============================================================

CREATE TABLE push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh_key  TEXT NOT NULL,
  auth_key    TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ============================================================
-- DISPUTE PROPOSALS (FI-17 — amount negotiation during a disputed settlement)
-- ============================================================
-- Each party can propose a different repayment amount during dispute resolution.
-- The other party can accept, counter-propose, or reject.
-- Latest pending proposal for a settlement reflects the current negotiation state.

CREATE TABLE dispute_proposals (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settlement_id           UUID NOT NULL REFERENCES monthly_settlements(id) ON DELETE CASCADE,
  household_id            UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  proposed_by_user_id     UUID NOT NULL REFERENCES auth.users(id),
  proposed_amount_cents   INTEGER NOT NULL CHECK (proposed_amount_cents >= 0),
  note                    TEXT,
  -- 'pending' = awaiting response; 'accepted' = other party agreed;
  -- 'countered' = superseded by a new proposal; 'rejected' = other party declined
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'countered', 'rejected')),
  responded_at            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dispute_proposals_settlement_id ON dispute_proposals(settlement_id);
CREATE INDEX idx_dispute_proposals_household_id ON dispute_proposals(household_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper function: returns household_id for the calling user
-- SET search_path = '' prevents search_path injection attacks on SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION get_user_household_ids()
RETURNS SETOF UUID
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT household_id FROM public.household_members WHERE user_id = auth.uid();
$$;

-- ============================================================
-- SECURITY DEFINER FUNCTIONS
-- These bypass RLS and enforce cross-table invariants atomically.
--
-- CALLER PERMISSIONS:
--   authenticated role : validate_invite_code, claim_invite, record_expense,
--                        record_saving_contribution, record_settlement_repayment
--   service_role only  : finalize_month_settlement  (cron / Edge Function)
--
-- SECURITY: All functions use SET search_path = '' to prevent search_path
-- injection attacks. All table references must be schema-qualified (public.*).
-- ============================================================

-- Validate an invite code without exposing the full invites table.
-- Returns empty set if code not found; is_valid = false if expired or used.
-- Callable by authenticated users.
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS TABLE (
  household_id   UUID,
  household_name TEXT,
  expires_at     TIMESTAMPTZ,
  is_valid       BOOLEAN
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    hi.household_id,
    h.name        AS household_name,
    hi.expires_at,
    (hi.used_at IS NULL AND hi.expires_at > NOW()) AS is_valid
  FROM public.household_invites hi
  JOIN public.households h ON h.id = hi.household_id
  WHERE hi.code = p_code;
$$;

-- Atomically claim an invite code and add the caller to the household.
-- Validates: code exists, not expired, not already used, caller not already a member.
-- Household max-2-members trigger fires on the INSERT household_members — will raise if full.
-- Callable by authenticated users.
CREATE OR REPLACE FUNCTION claim_invite(p_code TEXT, p_display_name TEXT)
RETURNS UUID  -- returns new household_id
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_invite   public.household_invites%ROWTYPE;
  v_uid      UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invite FROM public.household_invites WHERE code = p_code FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  IF v_invite.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite code already used';
  END IF;
  IF v_invite.expires_at <= NOW() THEN
    RAISE EXCEPTION 'Invite code expired';
  END IF;
  -- Lock households row to serialize concurrent claim_invite calls for the same household.
  -- The household_max_members_check trigger will also acquire this lock; taking it here
  -- first ensures the invite-used check and the member INSERT are serialized as a unit.
  PERFORM 1 FROM public.households WHERE id = v_invite.household_id FOR UPDATE;

  IF EXISTS (SELECT 1 FROM public.household_members WHERE household_id = v_invite.household_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'Already a member of this household';
  END IF;
  IF (SELECT COUNT(*) FROM public.household_members WHERE household_id = v_invite.household_id) >= 2 THEN
    RAISE EXCEPTION 'Household already has 2 members';
  END IF;

  UPDATE public.household_invites SET used_by = v_uid, used_at = NOW() WHERE id = v_invite.id;

  -- household_max_members_check trigger fires here as a secondary guard.
  INSERT INTO public.household_members (household_id, user_id, display_name)
  VALUES (v_invite.household_id, v_uid, p_display_name);

  RETURN v_invite.household_id;
END;
$$;

-- Atomically record an expense + update payment account + write account event.
-- Enforces:
--   (a) caller is a household member,
--   (b) payment account belongs to the caller (ownership boundary, not just household boundary),
--   (c) credit card: credit_used_cents + amount must not exceed credit_limit_cents,
--   (d) non-credit account: balance_cents - amount must remain >= 0 (enforced by DB constraint;
--       friendly error message raised here before the UPDATE),
--   (e) shared expense on a locked month → auto-sets is_late_adjustment = TRUE.
-- balance_after_cents for credit card events = available credit (limit - used_after).
-- Callable by authenticated users.
CREATE OR REPLACE FUNCTION record_expense(
  p_household_id        UUID,
  p_payment_account_id  UUID,
  p_amount_cents        INTEGER,
  p_date                DATE,
  p_expense_type        public.expense_type,
  p_category            public.expense_category,
  p_merchant_source     TEXT    DEFAULT NULL,
  p_summary             TEXT    DEFAULT '',
  p_notes               TEXT    DEFAULT NULL,
  p_attachment_url      TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid          UUID := auth.uid();
  v_account      public.payment_accounts%ROWTYPE;
  v_expense_id   UUID;
  v_avail_after  INTEGER;   -- available balance (or available credit) after charge
  v_is_late      BOOLEAN := FALSE;
BEGIN
  -- Membership check
  IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = v_uid AND household_id = p_household_id) THEN
    RAISE EXCEPTION 'User is not a member of this household';
  END IF;

  -- Lock account row; verify ownership (caller must own the account) and household membership
  SELECT * INTO v_account
  FROM public.payment_accounts
  WHERE id = p_payment_account_id
    AND household_id = p_household_id
    AND user_id = v_uid         -- OWNERSHIP boundary: account must belong to caller
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment account not found, does not belong to this household, or is not owned by you';
  END IF;

  -- Account-type-specific boundary checks
  IF v_account.type = 'credit_card' THEN
    IF v_account.credit_used_cents + p_amount_cents > v_account.credit_limit_cents THEN
      RAISE EXCEPTION 'Credit limit exceeded (limit: % cents, currently used: % cents, charge: % cents)',
        v_account.credit_limit_cents, v_account.credit_used_cents, p_amount_cents;
    END IF;
  ELSE
    IF v_account.balance_cents - p_amount_cents < 0 THEN
      RAISE EXCEPTION 'Insufficient balance (current: % cents, charge: % cents)',
        v_account.balance_cents, p_amount_cents;
    END IF;
  END IF;

  -- Late adjustment: shared expense whose date-month is already locked
  IF p_expense_type = 'shared' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.monthly_settlements
      WHERE household_id = p_household_id
        AND year  = EXTRACT(YEAR  FROM p_date)::SMALLINT
        AND month = EXTRACT(MONTH FROM p_date)::SMALLINT
        AND status IN ('pending_repayment', 'completed', 'disputed')
    ) INTO v_is_late;
  END IF;

  INSERT INTO public.expenses (
    household_id, user_id, payment_account_id, amount_cents, date,
    expense_type, category, merchant_source, summary, notes, attachment_url,
    is_late_adjustment
  ) VALUES (
    p_household_id, v_uid, p_payment_account_id, p_amount_cents, p_date,
    p_expense_type, p_category, p_merchant_source, p_summary, p_notes, p_attachment_url,
    v_is_late
  ) RETURNING id INTO v_expense_id;

  -- Update account balance: credit cards use credit_used_cents; others use balance_cents
  IF v_account.type = 'credit_card' THEN
    UPDATE public.payment_accounts
    SET credit_used_cents = credit_used_cents + p_amount_cents, updated_at = NOW()
    WHERE id = p_payment_account_id;
    -- available credit after charge
    v_avail_after := v_account.credit_limit_cents - (v_account.credit_used_cents + p_amount_cents);
  ELSE
    UPDATE public.payment_accounts
    SET balance_cents = balance_cents - p_amount_cents, updated_at = NOW()
    WHERE id = p_payment_account_id;
    v_avail_after := v_account.balance_cents - p_amount_cents;
  END IF;

  INSERT INTO public.account_events (
    household_id, account_id, user_id, event_type,
    amount_cents, balance_after_cents, reference_id, reference_type
  ) VALUES (
    p_household_id, p_payment_account_id, v_uid, 'expense',
    -p_amount_cents, v_avail_after, v_expense_id, 'expense'
  );

  RETURN v_expense_id;
END;
$$;

-- Atomically record a saving contribution + update goal total + debit source account + write event.
-- Enforces:
--   (a) caller is a household member,
--   (b) from_account belongs to the caller (ownership boundary),
--   (c) saving goal belongs to this household,
--   (d) sufficient balance in source account.
-- Only non-credit accounts can be used as source (savings are cash transfers).
-- Callable by authenticated users.
CREATE OR REPLACE FUNCTION record_saving_contribution(
  p_saving_goal_id   UUID,
  p_household_id     UUID,
  p_from_account_id  UUID,
  p_amount_cents     INTEGER,
  p_notes            TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid             UUID := auth.uid();
  v_account         public.payment_accounts%ROWTYPE;
  v_contribution_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = v_uid AND household_id = p_household_id) THEN
    RAISE EXCEPTION 'User is not a member of this household';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.saving_goals WHERE id = p_saving_goal_id AND household_id = p_household_id) THEN
    RAISE EXCEPTION 'Saving goal does not belong to this household';
  END IF;

  -- Ownership check: from_account must belong to the caller
  SELECT * INTO v_account
  FROM public.payment_accounts
  WHERE id = p_from_account_id
    AND household_id = p_household_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found, does not belong to this household, or is not owned by you';
  END IF;
  IF v_account.type = 'credit_card' THEN
    RAISE EXCEPTION 'Credit card accounts cannot be used as source for saving contributions';
  END IF;
  IF v_account.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance in source account (available: % cents, amount: % cents)',
      v_account.balance_cents, p_amount_cents;
  END IF;

  INSERT INTO public.saving_contributions (saving_goal_id, household_id, user_id, from_account_id, amount_cents, notes)
  VALUES (p_saving_goal_id, p_household_id, v_uid, p_from_account_id, p_amount_cents, p_notes)
  RETURNING id INTO v_contribution_id;

  UPDATE public.saving_goals
  SET current_amount_cents = current_amount_cents + p_amount_cents, updated_at = NOW()
  WHERE id = p_saving_goal_id;

  UPDATE public.payment_accounts
  SET balance_cents = balance_cents - p_amount_cents, updated_at = NOW()
  WHERE id = p_from_account_id;

  INSERT INTO public.account_events (
    household_id, account_id, user_id, event_type,
    amount_cents, balance_after_cents, reference_id, reference_type
  ) VALUES (
    p_household_id, p_from_account_id, v_uid, 'saving_transfer',
    -p_amount_cents, v_account.balance_cents - p_amount_cents, v_contribution_id, 'saving_contribution'
  );

  RETURN v_contribution_id;
END;
$$;

-- Atomically record settlement repayment: debit payer, credit payee, write both events, mark completed.
-- Enforces:
--   (a) settlement is in pending_repayment,
--   (b) caller is the designated payer,
--   (c) payer account is owned by payer (ownership boundary),
--   (d) payee account is owned by payee (ownership boundary),
--   (e) payer account has sufficient balance (non-credit),
--   (f) payer account cannot be a credit card (repayment must be from a liquid account).
-- Callable by authenticated users (specifically the payer).
CREATE OR REPLACE FUNCTION record_settlement_repayment(
  p_settlement_id     UUID,
  p_payer_account_id  UUID,
  p_payee_account_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid                  UUID := auth.uid();
  v_s                    public.monthly_settlements%ROWTYPE;
  v_payer_account        public.payment_accounts%ROWTYPE;
  v_payee_balance_after  INTEGER;
BEGIN
  SELECT * INTO v_s FROM public.monthly_settlements WHERE id = p_settlement_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;
  IF v_s.status != 'pending_repayment' THEN
    RAISE EXCEPTION 'Settlement must be in pending_repayment status (current: %)', v_s.status;
  END IF;
  IF v_uid != v_s.payer_user_id THEN
    RAISE EXCEPTION 'Only the designated payer can record repayment';
  END IF;

  -- Ownership + balance check on payer account
  SELECT * INTO v_payer_account
  FROM public.payment_accounts
  WHERE id = p_payer_account_id
    AND user_id = v_s.payer_user_id
    AND household_id = v_s.household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payer account not found or not owned by payer';
  END IF;
  IF v_payer_account.type = 'credit_card' THEN
    RAISE EXCEPTION 'Settlement repayment must be made from a non-credit account';
  END IF;
  IF v_payer_account.balance_cents < v_s.repayment_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance in payer account (available: % cents, required: % cents)',
      v_payer_account.balance_cents, v_s.repayment_amount_cents;
  END IF;

  -- Ownership check on payee account
  IF NOT EXISTS (
    SELECT 1 FROM public.payment_accounts
    WHERE id = p_payee_account_id AND user_id = v_s.payee_user_id AND household_id = v_s.household_id
  ) THEN
    RAISE EXCEPTION 'Payee account not found or not owned by payee';
  END IF;

  -- Debit payer
  UPDATE public.payment_accounts
  SET balance_cents = balance_cents - v_s.repayment_amount_cents, updated_at = NOW()
  WHERE id = p_payer_account_id;

  -- Credit payee (lock row for consistent balance_after snapshot)
  UPDATE public.payment_accounts
  SET balance_cents = balance_cents + v_s.repayment_amount_cents, updated_at = NOW()
  WHERE id = p_payee_account_id
  RETURNING balance_cents INTO v_payee_balance_after;

  INSERT INTO public.account_events (household_id, account_id, user_id, event_type, amount_cents, balance_after_cents, reference_id, reference_type)
  VALUES
    (v_s.household_id, p_payer_account_id, v_s.payer_user_id, 'settlement_repayment',
     -v_s.repayment_amount_cents, v_payer_account.balance_cents - v_s.repayment_amount_cents,
     p_settlement_id, 'settlement'),
    (v_s.household_id, p_payee_account_id, v_s.payee_user_id, 'settlement_repayment',
      v_s.repayment_amount_cents, v_payee_balance_after,
      p_settlement_id, 'settlement');

  UPDATE public.monthly_settlements
  SET status = 'completed', completed_at = NOW()
  WHERE id = p_settlement_id;
END;
$$;

-- Called by cron on the 1st of each month (service_role only).
-- Computes member totals, absorbs pending late-adjustment expenses, writes finalized_at.
-- NOT callable by authenticated users directly (revoked below).
CREATE OR REPLACE FUNCTION finalize_month_settlement(
  p_household_id  UUID,
  p_year          SMALLINT,
  p_month         SMALLINT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settlement_id   UUID;
  v_members         UUID[];
  v_user_a          UUID;
  v_user_b          UUID;
  v_total_a         INTEGER := 0;
  v_total_b         INTEGER := 0;
  v_repayment       INTEGER;
  v_payer           UUID;
  v_payee           UUID;
  v_month_start     DATE;
  v_month_end       DATE;
BEGIN
  v_month_start := make_date(p_year::INT, p_month::INT, 1);
  v_month_end   := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  SELECT id INTO v_settlement_id
  FROM public.monthly_settlements
  WHERE household_id = p_household_id AND year = p_year AND month = p_month AND status = 'calculating'
  FOR UPDATE;

  IF v_settlement_id IS NULL THEN
    RAISE EXCEPTION 'No calculating settlement for household % year % month %', p_household_id, p_year, p_month;
  END IF;

  SELECT ARRAY_AGG(user_id ORDER BY joined_at) INTO v_members
  FROM public.household_members WHERE household_id = p_household_id;

  IF ARRAY_LENGTH(v_members, 1) != 2 THEN
    RAISE EXCEPTION 'Expected 2 household members, found %', ARRAY_LENGTH(v_members, 1);
  END IF;

  v_user_a := v_members[1];
  v_user_b := v_members[2];

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_a
  FROM public.expenses
  WHERE household_id = p_household_id AND user_id = v_user_a
    AND expense_type = 'shared' AND date BETWEEN v_month_start AND v_month_end
    AND is_late_adjustment = FALSE;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_b
  FROM public.expenses
  WHERE household_id = p_household_id AND user_id = v_user_b
    AND expense_type = 'shared' AND date BETWEEN v_month_start AND v_month_end
    AND is_late_adjustment = FALSE;

  SELECT v_total_a + COALESCE(SUM(amount_cents), 0) INTO v_total_a
  FROM public.expenses
  WHERE household_id = p_household_id AND user_id = v_user_a
    AND expense_type = 'shared' AND is_late_adjustment = TRUE
    AND applied_to_settlement_id IS NULL;

  SELECT v_total_b + COALESCE(SUM(amount_cents), 0) INTO v_total_b
  FROM public.expenses
  WHERE household_id = p_household_id AND user_id = v_user_b
    AND expense_type = 'shared' AND is_late_adjustment = TRUE
    AND applied_to_settlement_id IS NULL;

  INSERT INTO public.settlement_member_totals (settlement_id, user_id, total_paid_cents)
  VALUES (v_settlement_id, v_user_a, v_total_a)
  ON CONFLICT (settlement_id, user_id) DO UPDATE SET total_paid_cents = EXCLUDED.total_paid_cents;

  INSERT INTO public.settlement_member_totals (settlement_id, user_id, total_paid_cents)
  VALUES (v_settlement_id, v_user_b, v_total_b)
  ON CONFLICT (settlement_id, user_id) DO UPDATE SET total_paid_cents = EXCLUDED.total_paid_cents;

  v_repayment := ABS(v_total_a - v_total_b) / 2;
  IF v_total_a < v_total_b THEN
    v_payer := v_user_a; v_payee := v_user_b;
  ELSE
    v_payer := v_user_b; v_payee := v_user_a;
  END IF;

  UPDATE public.expenses
  SET applied_to_settlement_id = v_settlement_id
  WHERE household_id = p_household_id
    AND expense_type = 'shared'
    AND is_late_adjustment = TRUE
    AND applied_to_settlement_id IS NULL;

  UPDATE public.monthly_settlements
  SET finalized_at           = NOW(),
      payer_user_id          = v_payer,
      payee_user_id          = v_payee,
      repayment_amount_cents = v_repayment
  WHERE id = v_settlement_id;
END;
$$;

-- ============================================================
-- FUNCTION PERMISSIONS
-- Supabase exposes functions to authenticated role by default.
-- Explicitly revoke and re-grant to lock down the surface.
-- ============================================================

-- Revoke default public access from all functions
REVOKE ALL ON FUNCTION get_user_household_ids()              FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_invite_code(TEXT)            FROM PUBLIC;
REVOKE ALL ON FUNCTION claim_invite(TEXT, TEXT)              FROM PUBLIC;
REVOKE ALL ON FUNCTION record_expense(UUID,UUID,INTEGER,DATE,public.expense_type,public.expense_category,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_saving_contribution(UUID,UUID,UUID,INTEGER,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_settlement_repayment(UUID,UUID,UUID)             FROM PUBLIC;
REVOKE ALL ON FUNCTION finalize_month_settlement(UUID,SMALLINT,SMALLINT)       FROM PUBLIC;

-- authenticated role: user-callable RPCs
GRANT EXECUTE ON FUNCTION get_user_household_ids()           TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT)         TO authenticated;
GRANT EXECUTE ON FUNCTION claim_invite(TEXT, TEXT)           TO authenticated;
GRANT EXECUTE ON FUNCTION record_expense(UUID,UUID,INTEGER,DATE,public.expense_type,public.expense_category,TEXT,TEXT,TEXT,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_saving_contribution(UUID,UUID,UUID,INTEGER,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_settlement_repayment(UUID,UUID,UUID)             TO authenticated;

-- finalize_month_settlement is service_role only (cron / Edge Function)
-- authenticated users cannot call it directly.
GRANT EXECUTE ON FUNCTION finalize_month_settlement(UUID,SMALLINT,SMALLINT) TO service_role;

-- ============================================================
-- REMAINING FINANCIAL OPERATION RPCs
-- ============================================================

-- Atomically transfer between two accounts owned within the same household.
-- Handles all inter-account transfers including credit card payoff
-- (transferring TO a credit card reduces credit_used_cents).
-- Accounts locked in ID order to prevent deadlocks on concurrent transfers.
-- Callable by authenticated users (caller must own the from_account).
CREATE OR REPLACE FUNCTION record_account_transfer(
  p_household_id    UUID,
  p_from_account_id UUID,
  p_to_account_id   UUID,
  p_amount_cents    INTEGER,
  p_note            TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid              UUID := auth.uid();
  v_from_acct        public.payment_accounts%ROWTYPE;
  v_to_acct          public.payment_accounts%ROWTYPE;
  v_from_avail_after INTEGER;
  v_to_avail_after   INTEGER;
  v_first_id         UUID;
  v_second_id        UUID;
  v_to_event_type    public.account_event_type;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.household_members WHERE user_id = v_uid AND household_id = p_household_id) THEN
    RAISE EXCEPTION 'User is not a member of this household';
  END IF;
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Source and destination accounts must be different';
  END IF;

  -- Lock both account rows in consistent UUID order to prevent deadlocks.
  -- PERFORM discards results but acquires the row-level lock for the transaction.
  IF p_from_account_id < p_to_account_id THEN
    v_first_id := p_from_account_id; v_second_id := p_to_account_id;
  ELSE
    v_first_id := p_to_account_id;   v_second_id := p_from_account_id;
  END IF;

  PERFORM 1 FROM public.payment_accounts WHERE id = v_first_id  FOR UPDATE;
  PERFORM 1 FROM public.payment_accounts WHERE id = v_second_id FOR UPDATE;

  -- Reload row data after locks are held
  SELECT * INTO v_from_acct FROM public.payment_accounts
  WHERE id = p_from_account_id AND user_id = v_uid AND household_id = p_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source account not found or not owned by you in this household';
  END IF;
  IF v_from_acct.type = 'credit_card' THEN
    RAISE EXCEPTION 'Cannot transfer from a credit card account';
  END IF;
  IF v_from_acct.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient balance in source account (available: % cents, amount: % cents)',
      v_from_acct.balance_cents, p_amount_cents;
  END IF;

  SELECT * INTO v_to_acct FROM public.payment_accounts
  WHERE id = p_to_account_id AND household_id = p_household_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Destination account not found in this household';
  END IF;

  -- Debit source
  UPDATE public.payment_accounts
  SET balance_cents = balance_cents - p_amount_cents, updated_at = NOW()
  WHERE id = p_from_account_id;
  v_from_avail_after := v_from_acct.balance_cents - p_amount_cents;

  -- Credit destination (credit card: reduce credit_used_cents; others: increase balance_cents)
  -- Event semantics: credit card repayment → 'credit_repayment'; ordinary receive → 'transfer_in'
  IF v_to_acct.type = 'credit_card' THEN
    UPDATE public.payment_accounts
    SET credit_used_cents = GREATEST(0, credit_used_cents - p_amount_cents), updated_at = NOW()
    WHERE id = p_to_account_id
    RETURNING (credit_limit_cents - credit_used_cents) INTO v_to_avail_after;
    v_to_event_type := 'credit_repayment';
  ELSE
    UPDATE public.payment_accounts
    SET balance_cents = balance_cents + p_amount_cents, updated_at = NOW()
    WHERE id = p_to_account_id
    RETURNING balance_cents INTO v_to_avail_after;
    v_to_event_type := 'transfer_in';
  END IF;

  INSERT INTO public.account_events (household_id, account_id, user_id, event_type, amount_cents, balance_after_cents, note)
  VALUES
    (p_household_id, p_from_account_id, v_uid, 'transfer_out',    -p_amount_cents, v_from_avail_after, p_note),
    (p_household_id, p_to_account_id,   v_uid, v_to_event_type,    p_amount_cents, v_to_avail_after,   p_note);
END;
$$;

-- Atomically credit a single account (top-up, refund).
-- event_type must be 'top_up' or 'refund'; enforced by CHECK.
-- Cannot be used on credit cards (those use credit_used_cents semantics).
-- Callable by authenticated users (caller must own the account).
CREATE OR REPLACE FUNCTION record_account_credit(
  p_household_id UUID,
  p_account_id   UUID,
  p_amount_cents INTEGER,
  p_event_type   public.account_event_type,  -- must be 'top_up' or 'refund'
  p_note         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_account  public.payment_accounts%ROWTYPE;
  v_new_bal  INTEGER;
BEGIN
  IF p_event_type NOT IN ('top_up', 'refund') THEN
    RAISE EXCEPTION 'record_account_credit only accepts top_up or refund event types';
  END IF;

  SELECT * INTO v_account FROM public.payment_accounts
  WHERE id = p_account_id AND user_id = v_uid AND household_id = p_household_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or not owned by you in this household';
  END IF;
  IF v_account.type = 'credit_card' THEN
    RAISE EXCEPTION 'Use record_account_transfer to credit a credit card (credit repayment semantics)';
  END IF;

  UPDATE public.payment_accounts
  SET balance_cents = balance_cents + p_amount_cents, updated_at = NOW()
  WHERE id = p_account_id
  RETURNING balance_cents INTO v_new_bal;

  INSERT INTO public.account_events (household_id, account_id, user_id, event_type, amount_cents, balance_after_cents, note)
  VALUES (p_household_id, p_account_id, v_uid, p_event_type, p_amount_cents, v_new_bal, p_note);
END;
$$;

-- Atomically apply a manual balance correction to a non-credit account.
-- Computes the delta (new_balance - current_balance) and writes a manual_adjustment event.
-- Callable by authenticated users (caller must own the account).
CREATE OR REPLACE FUNCTION record_manual_adjustment(
  p_household_id      UUID,
  p_account_id        UUID,
  p_new_balance_cents INTEGER,
  p_note              TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      UUID := auth.uid();
  v_account  public.payment_accounts%ROWTYPE;
  v_delta    INTEGER;
BEGIN
  SELECT * INTO v_account FROM public.payment_accounts
  WHERE id = p_account_id AND user_id = v_uid AND household_id = p_household_id
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
  SET balance_cents = p_new_balance_cents, updated_at = NOW()
  WHERE id = p_account_id;

  INSERT INTO public.account_events (household_id, account_id, user_id, event_type, amount_cents, balance_after_cents, note)
  VALUES (p_household_id, p_account_id, v_uid, 'manual_adjustment', v_delta, p_new_balance_cents, p_note);
END;
$$;

-- Sets the current used amount on a credit card account (onboarding + correction flow).
-- This is the ONLY way to adjust credit_used_cents directly — all runtime spending goes
-- through record_expense(), and repayments go through record_account_transfer().
-- Rejects non-credit accounts. Enforces 0 ≤ new_credit_used ≤ credit_limit.
-- Callable by authenticated users (caller must own the account).
CREATE OR REPLACE FUNCTION set_credit_card_used_balance(
  p_household_id       UUID,
  p_account_id         UUID,
  p_credit_used_cents  INTEGER,
  p_note               TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     UUID := auth.uid();
  v_account public.payment_accounts%ROWTYPE;
  v_delta   INTEGER;
BEGIN
  SELECT * INTO v_account FROM public.payment_accounts
  WHERE id = p_account_id AND user_id = v_uid AND household_id = p_household_id
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
      p_credit_used_cents, v_account.credit_limit_cents;
  END IF;

  v_delta := p_credit_used_cents - v_account.credit_used_cents;  -- positive = more debt, negative = paid down

  UPDATE public.payment_accounts
  SET credit_used_cents = p_credit_used_cents, updated_at = NOW()
  WHERE id = p_account_id;

  -- Record as manual_adjustment; balance_after_cents = available credit after adjustment
  INSERT INTO public.account_events (household_id, account_id, user_id, event_type, amount_cents, balance_after_cents, note)
  VALUES (p_household_id, p_account_id, v_uid, 'manual_adjustment', v_delta,
          v_account.credit_limit_cents - p_credit_used_cents, p_note);
END;
$$;

-- Grant new RPCs to authenticated role
REVOKE ALL ON FUNCTION record_account_transfer(UUID,UUID,UUID,INTEGER,TEXT)          FROM PUBLIC;
REVOKE ALL ON FUNCTION record_account_credit(UUID,UUID,INTEGER,public.account_event_type,TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_manual_adjustment(UUID,UUID,INTEGER,TEXT)               FROM PUBLIC;
REVOKE ALL ON FUNCTION set_credit_card_used_balance(UUID,UUID,INTEGER,TEXT)           FROM PUBLIC;

GRANT EXECUTE ON FUNCTION record_account_transfer(UUID,UUID,UUID,INTEGER,TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION record_account_credit(UUID,UUID,INTEGER,public.account_event_type,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_manual_adjustment(UUID,UUID,INTEGER,TEXT)               TO authenticated;
GRANT EXECUTE ON FUNCTION set_credit_card_used_balance(UUID,UUID,INTEGER,TEXT)           TO authenticated;

-- ============================================================
-- CRON LOGS (operational observability for scheduled Edge Functions)
-- ============================================================
-- Written by Edge Functions via service_role. Never written by authenticated clients.
-- Retained 90 days; provides audit trail for cron failure investigation.

CREATE TYPE cron_log_status AS ENUM ('success', 'error', 'partial');

CREATE TABLE cron_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  function_name   TEXT NOT NULL,                                 -- e.g. 'monthly-settlement-cron'
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  status          cron_log_status NOT NULL,
  households_processed INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,                                          -- NULL on success
  metadata        JSONB                                          -- optional structured context
);

CREATE INDEX idx_cron_logs_function_triggered ON cron_logs(function_name, triggered_at DESC);

-- RLS: no policies for authenticated role — cron_logs is operational data, not user data.
-- All reads and writes are performed by service_role (Edge Functions), which bypasses RLS.
-- Authenticated clients have zero access to this table.
ALTER TABLE cron_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on all tables
ALTER TABLE households                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_invites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_accounts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_line_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_settlements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_member_totals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_confirmations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_goals                ENABLE ROW LEVEL SECURITY;
ALTER TABLE saving_contributions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_budgets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_reviews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_monthly_recommendations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_proposals           ENABLE ROW LEVEL SECURITY;

-- ---- households ----
CREATE POLICY households_select ON households FOR SELECT
  USING (id IN (SELECT get_user_household_ids()));

CREATE POLICY households_insert ON households FOR INSERT
  WITH CHECK (TRUE); -- any authenticated user can create a household

CREATE POLICY households_update ON households FOR UPDATE
  USING (id IN (SELECT get_user_household_ids()));

-- ---- household_members ----
CREATE POLICY hm_select ON household_members FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY hm_insert ON household_members FOR INSERT
  WITH CHECK (user_id = auth.uid()); -- can only insert yourself

CREATE POLICY hm_update ON household_members FOR UPDATE
  USING (user_id = auth.uid()); -- can only update your own profile

-- ---- household_invites ----
-- SELECT: members can see their household's invites.
-- Code validation by non-members uses validate_invite_code() SECURITY DEFINER function
-- instead — avoids exposing the full invites table to unauthenticated or foreign users.
-- (OR code IS NOT NULL was removed: it is always TRUE and effectively made the table public.)
CREATE POLICY hi_select ON household_invites FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY hi_insert ON household_invites FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND created_by = auth.uid()
  );

-- UPDATE: existing members can revoke/manage invites for their household.
-- Claiming a code is handled atomically by claim_invite() SECURITY DEFINER function.
CREATE POLICY hi_update ON household_invites FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

-- ---- payment_accounts ----
CREATE POLICY pa_select ON payment_accounts FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY pa_insert ON payment_accounts FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid());

CREATE POLICY pa_update ON payment_accounts FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid()); -- prevents moving account to different household

CREATE POLICY pa_delete ON payment_accounts FOR DELETE
  USING (user_id = auth.uid()); -- only owner; app enforces archive instead of delete when events exist

-- ---- expenses ----
CREATE POLICY exp_select ON expenses FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- Cross-household AND ownership check: payment_account must belong to this household
-- AND to the calling user (ownership boundary, not just household boundary).
-- Prevents a user from charging another member's account on their expense.
-- NOTE: prefer calling record_expense() RPC over direct INSERT; RPC enforces this + credit semantics + balance guards.
CREATE POLICY exp_insert ON expenses FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND user_id = auth.uid()
    AND (SELECT household_id FROM payment_accounts WHERE id = payment_account_id) = household_id
    AND (SELECT user_id     FROM payment_accounts WHERE id = payment_account_id) = auth.uid()
  );

-- WITH CHECK prevents post-update row from pointing to a different household or changing user_id.
CREATE POLICY exp_update ON expenses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid());

-- ---- expense_line_items ----
CREATE POLICY eli_select ON expense_line_items FOR SELECT
  USING (expense_id IN (
    SELECT id FROM expenses WHERE household_id IN (SELECT get_user_household_ids())
  ));

CREATE POLICY eli_insert ON expense_line_items FOR INSERT
  WITH CHECK (expense_id IN (
    SELECT id FROM expenses WHERE user_id = auth.uid()
  ));

-- ---- account_events ---- (append-only; no update/delete)
CREATE POLICY ae_select ON account_events FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- Cross-household check: account must belong to the same household as the event.
-- All financial writes should go through SECURITY DEFINER RPCs (record_expense, etc.)
-- which bypass RLS; this policy is a defensive backstop for any direct inserts.
CREATE POLICY ae_insert ON account_events FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND user_id = auth.uid()
    AND (SELECT household_id FROM payment_accounts WHERE id = account_id) = household_id
  );

-- ---- monthly_settlements ----
CREATE POLICY ms_select ON monthly_settlements FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY ms_insert ON monthly_settlements FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY ms_update ON monthly_settlements FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids())); -- prevents moving settlement to foreign household

-- ---- settlement_member_totals ----
CREATE POLICY smt_select ON settlement_member_totals FOR SELECT
  USING (settlement_id IN (
    SELECT id FROM monthly_settlements WHERE household_id IN (SELECT get_user_household_ids())
  ));

CREATE POLICY smt_insert ON settlement_member_totals FOR INSERT
  WITH CHECK (settlement_id IN (
    SELECT id FROM monthly_settlements WHERE household_id IN (SELECT get_user_household_ids())
  ));

-- ---- settlement_confirmations ----
CREATE POLICY sc_select ON settlement_confirmations FOR SELECT
  USING (settlement_id IN (
    SELECT id FROM monthly_settlements WHERE household_id IN (SELECT get_user_household_ids())
  ));

CREATE POLICY sc_insert ON settlement_confirmations FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND settlement_id IN (
      SELECT id FROM monthly_settlements WHERE household_id IN (SELECT get_user_household_ids())
    )
  );

-- ---- saving_goals ----
CREATE POLICY sg_select ON saving_goals FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- For personal goals: owner_user_id must be the caller themselves (ownership boundary).
-- For shared goals: owner_user_id must be NULL (enforced by saving_goal_owner_consistency constraint too).
CREATE POLICY sg_insert ON saving_goals FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND (
      (type = 'shared'   AND owner_user_id IS NULL)
      OR (type = 'personal' AND owner_user_id = auth.uid())
    )
  );

CREATE POLICY sg_update ON saving_goals FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

-- ---- saving_contributions ----
CREATE POLICY scon_select ON saving_contributions FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- Cross-household AND ownership check: saving_goal must belong to this household;
-- from_account must belong to this household AND to the calling user (ownership boundary).
-- NOTE: prefer calling record_saving_contribution() RPC over direct INSERT.
CREATE POLICY scon_insert ON saving_contributions FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND user_id = auth.uid()
    AND (SELECT household_id FROM saving_goals     WHERE id = saving_goal_id)  = household_id
    AND (SELECT household_id FROM payment_accounts WHERE id = from_account_id) = household_id
    AND (SELECT user_id      FROM payment_accounts WHERE id = from_account_id) = auth.uid()
  );

-- ---- chore_tasks ----
CREATE POLICY ct_select ON chore_tasks FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY ct_insert ON chore_tasks FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY ct_update ON chore_tasks FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY ct_delete ON chore_tasks FOR DELETE
  USING (household_id IN (SELECT get_user_household_ids()));

-- ---- chore_completions ----
CREATE POLICY cc_select ON chore_completions FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY cc_insert ON chore_completions FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid());

CREATE POLICY cc_update ON chore_completions FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid()); -- only completer can update own row; prevents reassigning household_id or user_id

-- ---- monthly_plans ----
CREATE POLICY mp_select ON monthly_plans FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- personal: caller must own the row; household_total: any household member can insert (user_id IS NULL)
CREATE POLICY mp_insert ON monthly_plans FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND (
      (scope = 'personal'        AND user_id = auth.uid())
      OR (scope = 'household_total' AND user_id IS NULL)
    )
  );

-- personal: only owner can update; household_total: any household member can update
CREATE POLICY mp_update ON monthly_plans FOR UPDATE
  USING (
    household_id IN (SELECT get_user_household_ids())
    AND (
      (scope = 'personal'        AND user_id = auth.uid())
      OR (scope = 'household_total' AND user_id IS NULL)
    )
  )
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND (
      (scope = 'personal'        AND user_id = auth.uid())
      OR (scope = 'household_total' AND user_id IS NULL)
    )
  );

-- ---- personal_budgets ----
CREATE POLICY pb_select ON personal_budgets FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY pb_insert ON personal_budgets FOR INSERT
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid());

CREATE POLICY pb_update ON personal_budgets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (household_id IN (SELECT get_user_household_ids()) AND user_id = auth.uid());

-- ---- monthly_reviews ----
-- SELECT only for authenticated users.
-- INSERT/UPDATE are intentionally absent for the authenticated role:
-- these rows are server-generated by finalize_month_settlement() (cron, service_role)
-- and should never be writable from client code.
-- The service_role bypasses RLS and writes freely; no policy needed for that path.
CREATE POLICY mr_select ON monthly_reviews FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- ---- ai_monthly_recommendations ----
-- SELECT only for authenticated users.
-- INSERT/UPDATE are intentionally absent for the authenticated role:
-- these rows are generated by the /api/ai/monthly-recommendations Edge Function
-- running with service_role (bypasses RLS). Clients must never write AI results directly.
CREATE POLICY ai_select ON ai_monthly_recommendations FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

-- ---- push_subscriptions ----
CREATE POLICY ps_select ON push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY ps_insert ON push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ps_delete ON push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ---- dispute_proposals ----
CREATE POLICY dp_select ON dispute_proposals FOR SELECT
  USING (household_id IN (SELECT get_user_household_ids()));

CREATE POLICY dp_insert ON dispute_proposals FOR INSERT
  WITH CHECK (
    household_id IN (SELECT get_user_household_ids())
    AND proposed_by_user_id = auth.uid()
  );

CREATE POLICY dp_update ON dispute_proposals FOR UPDATE
  USING (household_id IN (SELECT get_user_household_ids()))
  WITH CHECK (household_id IN (SELECT get_user_household_ids()));

-- ============================================================
-- TRIGGERS (database-enforced invariants)
-- ============================================================

-- Settlement status state machine guard.
-- Valid transitions:
--   calculating      → pending_repayment | disputed
--   pending_repayment → completed | disputed
--   disputed          → pending_repayment  (after resolution)
--   completed         → (immutable; no transitions allowed)
CREATE OR REPLACE FUNCTION validate_settlement_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Cannot modify a completed settlement (id: %)', OLD.id;
  END IF;

  IF NOT (
    (OLD.status = 'calculating'      AND NEW.status IN ('pending_repayment', 'disputed')) OR
    (OLD.status = 'pending_repayment' AND NEW.status IN ('completed', 'disputed'))        OR
    (OLD.status = 'disputed'          AND NEW.status = 'pending_repayment')
  ) THEN
    RAISE EXCEPTION 'Invalid settlement status transition: % → %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER settlement_status_guard
  BEFORE UPDATE ON monthly_settlements
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_settlement_status_transition();

-- Payment account owner must be a household member.
-- Prevents accounts from being created for non-members or moved to foreign households.
CREATE OR REPLACE FUNCTION validate_account_owner_is_member()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = NEW.household_id AND user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'Payment account owner (user_id: %) must be a member of household %',
      NEW.user_id, NEW.household_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER account_owner_membership_check
  BEFORE INSERT OR UPDATE ON payment_accounts
  FOR EACH ROW EXECUTE FUNCTION validate_account_owner_is_member();

-- Chore task assignee and rotation_start_user must be household members (when set).
CREATE OR REPLACE FUNCTION validate_chore_task_users_are_members()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.assignee_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = NEW.household_id AND user_id = NEW.assignee_user_id
  ) THEN
    RAISE EXCEPTION 'Chore task assignee (user_id: %) must be a member of household %',
      NEW.assignee_user_id, NEW.household_id;
  END IF;

  IF NEW.rotation_start_user_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = NEW.household_id AND user_id = NEW.rotation_start_user_id
  ) THEN
    RAISE EXCEPTION 'Chore task rotation_start_user (user_id: %) must be a member of household %',
      NEW.rotation_start_user_id, NEW.household_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER chore_task_users_membership_check
  BEFORE INSERT OR UPDATE ON chore_tasks
  FOR EACH ROW EXECUTE FUNCTION validate_chore_task_users_are_members();

-- Dispute proposal: settlement must belong to the stated household.
-- Prevents mismatched (settlement_id, household_id) pairs on INSERT.
CREATE OR REPLACE FUNCTION validate_dispute_proposal_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM monthly_settlements
    WHERE id = NEW.settlement_id AND household_id = NEW.household_id
  ) THEN
    RAISE EXCEPTION 'Dispute proposal settlement_id % does not belong to household %',
      NEW.settlement_id, NEW.household_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispute_proposal_consistency_check
  BEFORE INSERT ON dispute_proposals
  FOR EACH ROW EXECUTE FUNCTION validate_dispute_proposal_consistency();

-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Current balance per account (readable alias)
CREATE VIEW account_balances AS
SELECT
  pa.id,
  pa.household_id,
  pa.user_id,
  pa.name,
  pa.type,
  CASE
    WHEN pa.type = 'credit_card' THEN pa.credit_limit_cents - pa.credit_used_cents
    ELSE pa.balance_cents
  END AS available_cents,
  pa.balance_cents,
  pa.credit_limit_cents,
  pa.credit_used_cents,
  pa.is_archived
FROM payment_accounts pa;

-- ============================================================
-- NOTES FOR APPLICATION LAYER
-- ============================================================

-- 1. MONETARY VALUES
--    All amounts stored in HKD cents (integer). Display: divide by 100.
--    e.g. $89.00 → 8900 cents

-- 2. RATIOS / PERCENTAGES
--    Stored in permille (integer × 10).
--    e.g. 20.0% → 200 permille
--    monthly_plans constraint enforces sum in [999, 1001] to handle rounding

-- 3. TIMEZONE
--    All TIMESTAMPTZ stored in UTC. Application must convert to Asia/Hong_Kong (UTC+8)
--    for display and for day/week/month boundary calculations.

-- 4. ROTATION TASK LOGIC
--    Rotation responsibility is computed at read time by the application:
--      week_index = floor((current_monday_utc8 - task.created_at_utc8) / 7)
--      responsible = household_members[(week_index + rotation_start_index) % member_count]
--    This is intentionally NOT stored in the DB to avoid sync issues.

-- 5. SHARED TASK COMPLETION
--    Each member inserts their OWN chore_completions row when they tick (completed_at = NOW()).
--    State is inferred from row count for (chore_task_id, scheduled_date):
--      0 rows → pending
--      1 row  → waiting_partner  (first tick done; push notification sent to partner)
--      2 rows → completed        (both ticked; task fully done)
--    Photo can be added to own row via UPDATE after ticking (cc_update RLS allows it).

-- 6. MONTHLY SETTLEMENT LIFECYCLE (performed by Edge Function cron)
--
--    DURING THE MONTH:
--      - monthly_settlements record exists with status = 'calculating'
--      - settlement_member_totals has NO rows yet
--      - FI-16 always computes live tally fresh from expenses (never reads settlement_member_totals)
--
--    CRON ON 1ST OF EACH MONTH (01:00 UTC = 09:00 HKT):
--      Step 1 — finalise PREVIOUS month:
--        a. Compute totals from expenses for previous month
--        b. INSERT settlement_member_totals for each member
--        c. UPDATE monthly_settlements SET finalized_at = NOW(), payer_user_id, payee_user_id, repayment_amount_cents
--        d. Send push notification to both members to confirm
--      Step 2 — open CURRENT month:
--        a. INSERT monthly_settlements (year, month, status = 'calculating') for each household
--           (on-demand fallback: same INSERT triggered when user opens FI-16 and no record exists)
--
--    CONFIRMATION WINDOW (starts at finalized_at):
--      - Both confirm → status = 'pending_repayment', locked_at = NOW()
--      - Daily reminder to unconfirmed party starting from day 1 of finalized_at, every day
--        until both confirm (→ 'pending_repayment') or deadline passes (→ 'disputed')
--      - Next month's 5th (HKT) without both confirming → status = 'disputed'
--
--    REPAYMENT:
--      - Payer records repayment → INSERT account_events + status = 'completed'
--
--    CALCULATION:
--      Regular expenses for month M:
--        base = WHERE expense_type = 'shared' AND date IN month M AND is_late_adjustment = FALSE
--      Late adjustment items from prior locked months, carried into month M:
--        adj  = WHERE expense_type = 'shared' AND is_late_adjustment = TRUE
--               AND applied_to_settlement_id IS NULL
--        (finalize_month_settlement() sets applied_to_settlement_id = settlement_id atomically;
--         NULL = not yet absorbed; avoids "application tracks this" fragility)
--      total_A = SUM(base + adj) for user A
--      total_B = SUM(base + adj) for user B
--      diff = ABS(total_A - total_B)
--      repayment_amount = diff / 2  (integer division; remainder ignored)
--      payer = member who paid less; payee = member who paid more

-- 7. ACCOUNT EVENTS ARE APPEND-ONLY
--    Never UPDATE or DELETE account_events. balance_after_cents provides full audit trail.
--    payment_accounts.balance_cents is the live denormalised balance; updated atomically with event INSERT.

-- 8. AI MONTHLY RECOMMENDATIONS — TRIGGER RULES
--    Primary:   Supabase cron on 1st of month 08:00 HKT generates previous month's advice
--    Fallback:  On FI-01 (Finance Overview) mount, app checks if recommendation exists for
--               previous month. If not, fires /api/ai/monthly-recommendations as a background
--               task. Does NOT block FI-01 render. FI-15 shows loading state until ready.
--    Manual:    User can regenerate from FI-15; previous version preserved (is_latest = FALSE).

-- 10. PERSONAL BUDGET vs RATIO PLANNING
--    personal_budgets: simple monthly spend cap for FI-09 (e.g. $4,500/month personal expenses)
--    monthly_plans: ratio-based planning for FI-08 (savings rate + category allocation)
--    These are INDEPENDENT. A user can set one, both, or neither.
--    FI-09 daily_available formula only reads personal_budgets, never monthly_plans.

-- 11. MONTHLY PLAN VERSIONING
--    user_id semantics: NULL for scope='household_total' (one plan per household); NOT NULL for scope='personal'.
--    When updating a personal plan for (user_id, year, month):
--      UPDATE monthly_plans SET is_active = FALSE WHERE user_id = $uid AND year = $y AND month = $m AND scope = 'personal' AND is_active = TRUE
--      INSERT monthly_plans (..., user_id = $uid, version = previous_version + 1, is_active = TRUE)
--    When updating the household_total plan for (household_id, year, month):
--      UPDATE monthly_plans SET is_active = FALSE WHERE household_id = $hid AND year = $y AND month = $m AND scope = 'household_total' AND is_active = TRUE
--      INSERT monthly_plans (..., user_id = NULL, version = previous_version + 1, is_active = TRUE)
--    Two partial unique indexes enforce exactly one active plan per scope:
--      idx_monthly_plans_personal_active_unique  ON (household_id, user_id, year, month) WHERE scope='personal' AND is_active=TRUE
--      idx_monthly_plans_household_active_unique ON (household_id, year, month)          WHERE scope='household_total' AND is_active=TRUE

-- 12. TRANSACTION-SAFE WRITE PATHS (SECURITY DEFINER RPCs)
--    The following operations MUST go through their corresponding SECURITY DEFINER functions
--    to guarantee atomicity, cross-table consistency, and correct balance ledger state.
--    Direct client INSERTs on these tables are a defensive fallback only.
--
--    record_expense(household_id, payment_account_id, amount_cents, date, expense_type, category, ...)
--      → INSERT expenses + UPDATE payment_accounts.balance_cents + INSERT account_events
--      → auto-sets is_late_adjustment based on settlement status for the expense date-month
--
--    record_saving_contribution(saving_goal_id, household_id, from_account_id, amount_cents, ...)
--      → INSERT saving_contributions + UPDATE saving_goals.current_amount_cents
--        + UPDATE payment_accounts.balance_cents + INSERT account_events
--
--    record_settlement_repayment(settlement_id, payer_account_id, payee_account_id)
--      → SELECT monthly_settlements FOR UPDATE (concurrency lock)
--      → UPDATE payment_accounts (payer debit, payee credit) + INSERT account_events (×2)
--      → UPDATE monthly_settlements SET status = 'completed'
--
--    finalize_month_settlement(household_id, year, month)      [cron only]
--      → SELECT monthly_settlements FOR UPDATE
--      → Compute totals, INSERT settlement_member_totals (×2)
--      → UPDATE late-adjustment expenses SET applied_to_settlement_id
--      → UPDATE monthly_settlements SET finalized_at, payer_user_id, payee_user_id, repayment_amount_cents
--
--    claim_invite(code, display_name)
--      → SELECT household_invites FOR UPDATE + validate + UPDATE used_by/used_at
--      → INSERT household_members
