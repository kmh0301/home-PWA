# Project Plan
# Home Collaboration PWA

**Based on**: PRD v1.14 + PAGEFLOW v0.1
**Created**: 2026-03-12
**Status**: Active

---

## Overview

**Goal**: Launch a **2-person household** (couples) home management PWA covering all P0 + P1 features in v1.
> **Scope commitment**: v1 supports exactly 2-member households. Settlement arithmetic (diff÷2) and the DB schema (trigger enforcing max 2 members, `finalize_month_settlement()` asserting exactly 2) are designed for couples only. Multi-member family support is explicitly v2+.
**Tech Stack**: Next.js + TypeScript (App Router), shadcn/ui, Supabase (Postgres + Auth + Storage + RLS), Gemini 2.5 Flash, Vercel
**Total Pages**: 29 screens (24 P0, 5 P1)

---

## Milestones

| # | Milestone | Success Criteria |
|---|-----------|-----------------|
| 1 | Foundation Ready | Next.js boots, Supabase schema applied, Auth works, RLS enabled |
| 2 | Onboarding Complete | User can register, create/join household, set up payment accounts |
| 3 | Finance Core Live | AI expense input → confirm → save; accounts with live balance; personal budget |
| 4 | Finance Full (P0) | Ratio planning, savings goals, monthly settlement (incl. dispute flow) |
| 5 | Finance Analytics | Monthly review + annual review + AI recommendations |
| 6 | Chores + Dashboard | Chores complete; Dashboard fully populated with real chore data |
| 7 | PWA Launch-Ready | Offline cache, push notifications, Lighthouse ≥ 90, RLS audit pass |

---

## Estimated Timeline

| Phase | Weeks | Core Deliverable |
|-------|-------|-----------------|
| 0 Foundation | 1 | Runnable project + full DB schema |
| 1 Onboarding | 1 | User can join a household |
| 2 Finance Core | 2 | AI expense entry works end-to-end |
| 3 Finance Planning & Settlement | 1 | Settlement + ratio planning complete |
| 4 Finance Analytics | 1 | Monthly review + annual review + AI recommendations |
| 5 Chores | 0.5 | All 3 task types, shared-task logic, photo check-in |
| 6 Dashboard | 0.5 | Fully populated home screen (depends on Chores) |
| 7 PWA Polish & Push | 1 | Offline, push, Lighthouse ≥ 90, security |
| **Total** | **~8 weeks** | **v1 full launch (P0 + P1)** |

---

## Phase 0: Project Foundation (Week 1)

### 0.1 Next.js Project Init
- [ ] `npx create-next-app@latest` with TypeScript, App Router, Tailwind
- [ ] Install and configure shadcn/ui (`npx shadcn@latest init`)
- [ ] Add base layout: bottom nav shell (4 tabs), root providers
- [ ] Configure path aliases (`@/` → `src/`)
- [ ] Set up ESLint + Prettier + Husky pre-commit

### 0.2 Supabase Setup
- [ ] Create Supabase project; save keys to `.env.local`
- [ ] Apply full DB schema (see `docs/plans/DB-SCHEMA.sql`)
- [ ] Run `supabase gen types typescript` → `src/types/database.types.ts`
- [ ] Install `@supabase/ssr` + configure client/server helpers
- [ ] Verify RLS is enabled on all 21 tables (see DB-SCHEMA.sql for full list; cron_logs is included but has no authenticated policies by design)

### 0.3 Auth Integration
- [ ] Supabase Auth: email/password + Google OAuth + Apple OAuth
- [ ] Auth middleware (`middleware.ts`): protect all non-auth routes
- [ ] Session helpers: `getUser()` server-side, `useUser()` client-side
- [ ] Auth callback route: `/auth/callback`

### 0.4 PWA Scaffold
- [ ] `next-pwa` or `@ducanh2912/next-pwa` setup
- [ ] `public/manifest.json`: name, icons, display=standalone, theme_color
- [ ] Service worker: basic precache (shell + static assets)
- [ ] Verify "Add to Home Screen" on iOS Safari + Android Chrome

### 0.5 CI/CD
- [ ] Connect repo to Vercel; auto-deploy `main`
- [ ] Add env vars to Vercel project
- [ ] Preview deployments on PRs

---

## Phase 1: Onboarding (Week 2)

### 1.1 OB-01 Splash Screen
- [ ] Full-screen logo + tagline
- [ ] Auth state check on mount:
  - No session → `/login`
  - Session, no household → `/onboarding/create`
  - Session + household → `/`

### 1.2 OB-02 Login / Register
- [ ] Email + password form with toggle (login ↔ register)
- [ ] Register: add display name field + password confirm
- [ ] Google OAuth button → Supabase OAuth flow
- [ ] Apple OAuth button → Supabase OAuth flow
- [ ] Error states: wrong password, email taken, network fail
- [ ] "Forgot password" → Supabase reset email

### 1.3 OB-03 Create Household
- [ ] Household name input
- [ ] On submit: `INSERT households` + `INSERT household_members` (creator)
- [ ] Generate 6-char alphanumeric invite code → `INSERT household_invites`
- [ ] Show invite code modal with copy + share buttons
- [ ] Proceed to OB-05

### 1.4 OB-04 Join Household via Invite Code
- [ ] 6-char code input (auto-uppercase)
- [ ] Validate: call `validate_invite_code(code)` SECURITY DEFINER RPC → returns `{ household_name, is_valid, expires_at }`; show household name preview on valid; show error if `is_valid = false` or empty result
- [ ] On confirm: call `claim_invite(code, display_name)` SECURITY DEFINER RPC
  - Atomically: marks invite as used + `INSERT household_members` in one transaction
  - DB trigger `household_max_members_check` fires on INSERT → raises if household already has 2 members
  - Raises on: invalid code, expired, already a member, household full
- [ ] Error states: map DB exception messages to user-facing strings (invalid/expired/full/duplicate)
- [ ] Proceed to OB-05

### 1.5 OB-05 Initial Payment Account Setup
- [ ] Pre-render default accounts: Alipay HK, PayMe, Cash (checked), Credit Card (unchecked)
- [ ] Each enabled account shows initial balance field
- [ ] Credit card: limit + current used fields
- [ ] `[+ Add custom account]` → inline name + type selector
- [ ] On complete: for each enabled account:
  - `INSERT payment_accounts` (initial account creation — brand-new records, no existing state to protect)
  - If initial balance > 0: call `record_manual_adjustment(household_id, account_id, initial_balance_cents, 'Initial setup')` RPC → writes `manual_adjustment` account_event atomically
  - Credit card with existing used amount: call `set_credit_card_used_balance(household_id, account_id, credit_used_cents, 'Initial setup')` RPC → validates 0 ≤ used ≤ limit, updates `credit_used_cents`, writes `manual_adjustment` account_event atomically
- [ ] "Skip" → proceed with no accounts (can set up later in FI-07)

### 1.6 RLS Integration Test
- [ ] Create two test households; confirm cross-household queries return 0 rows for all 21 tables
- [ ] Verify `household_members` policy: user can only see their own household's members

---

## Phase 2: Finance Core (Weeks 3–4)

### 2.1 Gemini 2.5 Flash Integration
- [ ] Create `/api/ai/parse-expense` route (POST)
- [ ] Input: `{ text?: string, imageBase64?: string }`
- [ ] Prompt engineering: extract `{ amount, date, category, payment_account_type, merchant_source, summary, line_items[] }`
- [ ] Account type → map to user's actual `payment_accounts` by type; return `account_id` or `null` (→ "待選擇帳戶")
- [ ] Return structured JSON with confidence flags per field
- [ ] On Gemini error/timeout (> 5s): return `{ error: 'fallback' }`

### 2.2 FI-02 AI Text Expense Input
- [ ] Large textarea with placeholder ("Keeta 買咗飯 $89，用 Alipay 付")
- [ ] "✦ AI Analyse" button → calls `/api/ai/parse-expense`
- [ ] Loading state during API call
- [ ] On success → navigate to FI-04 with pre-filled data
- [ ] On `fallback` → expand inline manual form (keep original text as note)
- [ ] Quick category chips (shortcut, sets category hint in prompt)
- [ ] Recent inputs list (last 3, from `localStorage`)
- [ ] Photo/screenshot shortcut buttons → FI-03

### 2.3 FI-03 AI Image/Receipt Input
- [ ] Camera capture button (PWA `capture="environment"`)
- [ ] Gallery picker button
- [ ] Image preview with crop/rotate optional
- [ ] On image selected → call `/api/ai/parse-expense` with base64
- [ ] Loading skeleton during OCR
- [ ] On success → FI-04
- [ ] On `fallback` → toast + manual form with image as attachment

### 2.4 FI-04 AI Confirmation Form
- [ ] Pre-populate all fields from AI result (editable)
- [ ] **AI confidence indicators** (US-002): each AI-filled field shows a confidence badge (`high` / `med` / `low`) derived from the AI response's per-field confidence flags; low-confidence fields highlighted in amber as a visual cue to review before saving
- [ ] **Summary field** (required, always visible):
  - AI mode: pre-filled with AI-generated summary (e.g. "Keeta 外賣")
  - Manual/fallback mode: auto-filled with `[category] $[amount]` format (e.g. "飲食 $89"), editable — ensures `summary NOT NULL` is always satisfied
- [ ] **Line items block** (optional): shown only if AI returned line items; collapsible
- [ ] Fields: amount, date (datepicker), payment_account (dropdown of user accounts), merchant_source (optional text), expense_type (personal/shared radio), category (dropdown), notes, attachment image
- [ ] `payment_account` = "⚠ 待選擇帳戶" in red if AI couldn't match; blocks save until resolved
- [ ] **Late adjustment detection** (PRD 8.1): on save, check if `date` falls in a month where `monthly_settlements.status IN ('pending_repayment', 'completed', 'disputed')` for this household
  - If yes AND `expense_type = 'shared'`: show warning banner "此日期屬於已鎖定的結算月份，將標記為下期調整項"
  - Save with `is_late_adjustment = TRUE`; do NOT modify the locked settlement
- [ ] Duplicate detection: before save, query `expenses` for same `(amount, date, account_id, summary)` within 5 min window; if match → confirm modal
- [ ] On confirm save: call `record_expense(household_id, payment_account_id, amount_cents, date, expense_type, category, merchant_source, summary, notes, attachment_url)` SECURITY DEFINER RPC
  - Atomically: `INSERT expenses` + account-type-aware balance update + `INSERT account_events`
  - Credit card accounts: increments `credit_used_cents`; raises if credit limit exceeded
  - Non-credit accounts: decrements `balance_cents`; raises if balance insufficient
  - Auto-sets `is_late_adjustment = TRUE` if shared expense date falls in a locked settlement month
  - Enforces: caller owns the payment account (ownership boundary, not just household boundary)
- [ ] `INSERT expense_line_items` separately after RPC returns (line items are supplementary; not part of balance transaction)
- [ ] Late-adjustment detection UI: shown by RPC returning expense with `is_late_adjustment = TRUE`; display warning banner "此日期屬於已鎖定的結算月份，將標記為下期調整項"
- [ ] Navigate back to FI-01 with success toast

### 2.5 FI-05 Payment Account List
- [ ] List all user's `payment_accounts` (not archived)
- [ ] Each row: icon by type, name, balance (or credit available/used for credit card)
- [ ] Sum footer: total liquid balance (non-credit-card accounts)
- [ ] `[+ Add Account]` → FI-07
- [ ] Tap row → FI-06

### 2.6 FI-06 Account Detail + Event History
- [ ] Header: account name, current balance (large)
- [ ] Action buttons row — all financial operations go through SECURITY DEFINER RPCs:
  - `[+ 充值/入帳]` → bottom sheet with **event type selector**:
    - **充值/存款** (top_up): amount + note → call `record_account_credit(household_id, account_id, amount_cents, 'top_up', note)` RPC
    - **退款** (refund): amount + merchant name + note → call `record_account_credit(household_id, account_id, amount_cents, 'refund', note)` RPC
  - `[↔ 轉帳]` → transfer form:
    - From account (pre-selected, must be owned by caller) + To account (any household account) + amount + note
    - Call `record_account_transfer(household_id, from_account_id, to_account_id, amount, note)` RPC
    - Atomically: debit from_account + credit to_account + write both `account_events`; deadlock-safe (accounts locked by UUID order)
  - `[信用卡還款]` (shown only when account type = credit_card):
    - Select from-account (non-credit, owned by caller) + amount
    - Call `record_account_transfer(household_id, from_account_id, credit_card_id, amount, note)` RPC — transferring TO a credit card reduces `credit_used_cents` automatically; destination event written as `credit_repayment` (not `transfer_in`)
  - `[手動調整]` (non-credit accounts): new balance input → call `record_manual_adjustment(household_id, account_id, new_balance_cents, note)` RPC → writes `manual_adjustment` event with computed delta atomically
  - `[信用卡已用餘額調整]` (credit card accounts): new credit_used input → call `set_credit_card_used_balance(household_id, account_id, credit_used_cents, note)` RPC → validates limit, writes `manual_adjustment` event
- [ ] Event list paginated (20/page), grouped by date
- [ ] Each event: description, amount (±), time, event type badge
- [ ] Overflow menu (⋮): edit name, archive (has events → set `is_archived = TRUE`; no events → hard delete)

### 2.7 FI-07 Add / Edit Payment Account
- [ ] Account type radio: Alipay HK | PayMe | Cash | Credit Card | Custom
- [ ] Name field (pre-filled by type, editable)
- [ ] Credit card: limit + current used balance
- [ ] Non-credit: initial balance
- [ ] Save (create): `INSERT payment_accounts`; if initial balance > 0 call `record_manual_adjustment(household_id, account_id, initial_balance_cents, 'Initial setup')` RPC to write opening event
- [ ] Save (edit): `UPDATE payment_accounts` (name/limit only); balance changes only via FI-06 manual adjustment flow

### 2.8 FI-09 Personal Budget + Daily Available Amount
- [ ] Monthly budget input with edit button
- [ ] **Formula**: `daily_available = (budget - personal_spent_this_month) / remaining_days_this_month - personal_spent_today`
  - Only counts `expense_type = 'personal'`; shared expenses are excluded
- [ ] Display: today's available (large), progress bar, used/remaining this month
- [ ] Calculation breakdown shown (transparent: "$X left ÷ Y days = $Z/day, today used $W")
- [ ] Warning states: normal (green) | < 20% of daily target (orange + ⚠) | exceeded (red + ⚠)
- [ ] Optional alert toggle: notify when today's usage hits 80% of daily available
- [ ] Save budget: `UPSERT personal_budgets (user_id, year, month, budget_cents)`
  - Note: this is **independent** of FI-08 ratio planning; do not derive from `monthly_plans`

### 2.9 FI-01 Finance Overview
- [ ] Today's daily available card (taps → FI-09)
- [ ] This month's shared expense summary: each member's total paid, difference, settlement status
- [ ] Quick-access grid: AI Expense | Accounts | Ratio Plan | Savings | Monthly Review | AI Tips
- [ ] Recent transactions list (last 5 from `expenses` across household)
- [ ] FAB (bottom right): `[✦ AI Expense]` → expand to text/photo options
- [ ] **On mount (PRD 4.2.9)**: silently check if `ai_monthly_recommendations` exists for prev month; if not, fire `/api/ai/monthly-recommendations` as background task (do not block page render; no loading indicator on FI-01)

---

## Phase 3: Finance Planning & Settlement (Week 5)

### 3.1 FI-08 Ratio Planning
- [ ] **Scope toggle: Personal (default) | Household Total** — per PRD 4.2.0; saves to `monthly_plans.scope`
- [ ] Target month toggle: This Month / Next Month
- [ ] Monthly income input (HKD)
- [ ] Preset templates: Conservative (30% savings) / Balanced (20%) / Flexible (10%)
- [ ] Savings rate input (0–100%, step 0.1%, marked ★ required)
- [ ] 6 category % inputs: food, home, transport, entertainment, medical, other
- [ ] Live total validator: sum = savings_rate + all categories; show real-time total; red if ≠ 100% ± 0.1%
- [ ] Each % auto-converts to HKD amount (round to integer)
- [ ] Save disabled until total valid
- [ ] On save: `UPSERT monthly_plans` (same month = new version, old set inactive)
- [ ] Show saved summary: target savings amount + per-category budgets

### 3.2 FI-10 Savings Goal List
- [ ] Tabs: Shared | Personal
- [ ] Each card: icon, name, progress bar, amount/target, completion %
- [ ] Completed goals collapsed/greyed
- [ ] `[+ New Goal]` → inline form (name, target amount, type, optional notes)
- [ ] Tap card → FI-11

### 3.3 FI-11 Savings Goal Detail
- [ ] Progress bar + % + current/target amounts
- [ ] Per-member contribution breakdown (name, amount, %)
- [ ] `[+ Deposit]` button → FI-12
- [ ] Contribution log (paginated): date, member, amount, source account
- [ ] Overflow: edit goal name/target, mark as completed, delete (only if no contributions)

### 3.4 FI-12 Record Saving Deposit
- [ ] Goal selector dropdown (pre-selected if coming from FI-11)
- [ ] Amount input
- [ ] Source account radio list (user's non-archived accounts with current balance shown)
- [ ] Balance impact preview: "Alipay $1,240 → $740 after deposit"
- [ ] On save: call `record_saving_contribution(saving_goal_id, household_id, from_account_id, amount_cents, notes)` SECURITY DEFINER RPC
  - Atomically: `INSERT saving_contributions` + `UPDATE saving_goals.current_amount_cents` + `UPDATE payment_accounts.balance_cents` + `INSERT account_events`
  - Enforces: from_account must be owned by caller (ownership boundary); credit cards rejected; balance must be sufficient
  - Raises with friendly message on insufficient balance or wrong account owner

### 3.5 FI-16 Monthly Settlement
FI-16 shows **two distinct sections**:

**A. Settlement needing action (previous month)**
- Load most recent `monthly_settlements` record that is NOT `completed` (i.e. `pending_repayment` | `disputed` | `calculating` with `finalized_at` set)
- Status badge: `計算中` | `待還款` | `已完成` | `爭議中`
- If `finalized_at` IS set: show `settlement_member_totals` (locked snapshot); otherwise compute live from expenses
- **Confirm section** (visible after `finalized_at`): show each member's confirmation status; `[✓ Confirm Amount]` for unconfirmed party
  - On confirm: `INSERT settlement_confirmations (settlement_id, user_id)`
  - When both confirmed: `UPDATE monthly_settlements SET status = 'pending_repayment', locked_at = NOW()`
- **Repayment section** (shown when status = `待還款`):
  - `[Record Repayment]` → select payer's from-account (non-credit only) + payee's to-account
  - On save: call `record_settlement_repayment(settlement_id, payer_account_id, payee_account_id)` SECURITY DEFINER RPC
    - Atomically: debit payer + credit payee + `INSERT account_events` × 2 + `UPDATE status = 'completed'`
    - Enforces: caller must be the payer; payer account owned by payer; payee account owned by payee; payer account must not be credit card; payer must have sufficient balance
    - Settlement status transition enforced by `settlement_status_guard` DB trigger (invalid transitions raise)
- Reminder logic (counted from `finalized_at`):
  - **Daily reminder to unconfirmed party starting from day 1** of `finalized_at`, every day until both confirm or status → `disputed` (push notification; cron queries unconfirmed parties each day)
  - Next month's 5th 23:59 HKT passes with only 1 confirmation → `UPDATE status = 'disputed'` → redirect FI-17

**B. Current month live tally**
- Always query fresh from `expenses WHERE is_late_adjustment = FALSE` (never reads `settlement_member_totals`)
- Show each member's shared expense total so far + running difference
- Label clearly: "本月進行中（X月）"

**C. Late adjustment items (PRD 8.1)**
- Query `expenses WHERE is_late_adjustment = TRUE AND date in previous locked months`
- Show as separate section: "待計入項目（上月補記）" with each item + amount + recorder
- Include these in current month's live tally total with a footnote

**D. History list**
- Past completed/disputed settlements with status chip + repayment amount

### 3.6 FI-17 Settlement Dispute Page
- [ ] Show disputed settlement with computed amounts
- [ ] Both-party action buttons: `[I Agree]` + `[Propose Different Amount]`
- [ ] If both agree: re-run confirmation flow → `pending_repayment`
- [ ] If one proposes change: `INSERT dispute_proposals (settlement_id, proposed_by_user_id, proposed_amount_cents, note)`; show proposed amount to other party via Realtime subscription
  - Other party: `[Accept]` → mark proposal `status = 'accepted'` → re-run confirmation flow; `[Counter-propose]` → INSERT new proposal, mark old as `'countered'`
- [ ] **Dispute proposals are persisted** in `dispute_proposals` table (see DB schema); latest `status = 'pending'` row is the active proposal
- [ ] Note: does not block new month's settlement; unresolved shown as banner in FI-01

### 3.7 Scheduled Settlement Job
- [ ] Supabase Edge Function: `monthly-settlement-cron`
- [ ] Trigger: `0 1 1 * *` UTC = **09:00 HKT on the 1st of each month**
- [ ] **Step 1 — Finalise previous month** (for each active household):
  - Call `finalize_month_settlement(household_id, year, month)` SECURITY DEFINER RPC (service_role only)
  - Atomically: computes totals per member, absorbs unabsorbed late-adjustment items (`applied_to_settlement_id`), `INSERT settlement_member_totals`, `UPDATE monthly_settlements SET finalized_at, payer_user_id, payee_user_id, repayment_amount_cents`
  - After RPC returns: trigger push notification to both members: "X月結算時間到，快去確認"
- [ ] **Step 2 — Open current month** (for each active household):
  - `INSERT monthly_settlements (year, month, status = 'calculating')` ON CONFLICT DO NOTHING
- [ ] **Step 3 — Compute `monthly_reviews` for previous month** (for each active household):
  - **`personal` scope** (one row per member): aggregate each member's personal + shared expenses by category; look up their active `monthly_plans (scope='personal')` for savings_rate_permille
    - `UPSERT monthly_reviews (household_id, user_id=<member>, year, month, scope='personal', ...)`
  - **`household_total` scope** (ONE row per household, `user_id = NULL`): aggregate all household shared expenses by category; look up active `monthly_plans (scope='household_total', user_id IS NULL)` for savings_rate_permille — there is exactly ONE active household_total plan per household per month (`idx_monthly_plans_household_active_unique` enforces this)
    - `UPSERT monthly_reviews (household_id, user_id=NULL, year, month, scope='household_total', ...)` — single row, not per-member duplicate
    - `UNIQUE INDEX idx_monthly_reviews_household_unique ON (household_id, year, month) WHERE scope = 'household_total'` enforces this at DB level
  - **This snapshot is required input for `/api/ai/monthly-recommendations`** (Phase 4.3); AI cron at 08:00 HKT runs after this step
- [ ] **On-demand fallback**: same Step 2 INSERT triggered when user opens FI-16 and no record exists for current month (cron failure recovery)

---

## Phase 4: Finance Analytics (Week 6)

### 4.1 FI-13 Monthly Review
- [ ] Month selector (default: current month)
- [ ] Scope toggle: Personal | Household Total
- [ ] Total spent (vs budget/plan)
- [ ] Category table: actual % | target % | diff % | diff HKD (colour-coded ±)
- [ ] Top 3 over-budget categories (red) + Top 3 under-budget (green)
- [ ] If no plan set: show actual distribution only; "目標" column = "未設定"; CTA → FI-08
- [ ] Shared expenses shown separately in Household Total scope

### 4.2 FI-14 Annual Review [P1]
- [ ] Year selector
- [ ] Scope toggle: Household Total | Personal
- [ ] 12-month bar/line chart: monthly total spend
- [ ] Savings rate trend line chart (with target line dashed)
- [ ] Year-to-date hit rate: how many months met savings target (dot calendar)
- [ ] Per-category annual average % + month-to-month variance
- [ ] Data degradation rules:
  - < 3 months data: hide charts, show "資料累積中"
  - 3–11 months: show with "樣本不足，僅供參考" banner
  - ≥ 12 months: full view

### 4.3 FI-15 AI Monthly Recommendations [P1]
- [ ] Load latest recommendation from `ai_monthly_recommendations` for current user + prev month
- [ ] If none: show loading state; on-demand generation already triggered by FI-01 (see 2.9)
- [ ] **`/api/ai/monthly-recommendations` route**:
  - Fetch: prev month's `monthly_reviews`, `monthly_plans`, all `expenses` for that month
  - Build prompt: actual vs target per category, savings rate, top transactions
  - Gemini output format: `{ summary, recommendations[], suggested_savings_rate, generated_at }`
  - Each recommendation: `{ category, current_ratio, target_ratio, issue, suggestion, expected_impact, confidence, scope, data_points[] }`
  - Validate: ≥ 1 category rec + ≥ 1 savings-rate rec; each with ≥ 2 data points; **cap at 3 recommendations total** (具體行動建議 max 3 — prompt instructs Gemini to return only the 3 highest-impact items)
  - `INSERT ai_monthly_recommendations` (set `is_latest = true`, set previous to `false`)
- [ ] UI: summary card + per-category recommendation cards (colour by confidence: high/med/low)
- [ ] Each card: current → issue → suggestion → expected impact + scope label + confidence badge
- [ ] `[Regenerate]` button: re-runs API, preserves previous version in DB
- [ ] Cron trigger: Supabase Edge Function runs `1st of month 08:00 HKT` for all households

---

## Phase 5: Chores (Week 7, first half)

### 5.1 CH-01 Daily Checklist
- [ ] Query today's due tasks:
  - Personal: `assignee_user_id = me`, frequency matches today
  - Rotation: compute current responsible user (see 5.4), show if it's me
  - Shared: always show to both members
- [ ] Completion state inferred from `chore_completions` row count for `(chore_task_id, scheduled_date)`:
  - Personal/rotation: 0 rows → pending; 1 row (own) → completed
  - Shared: 0 rows → pending; 1 row → waiting_partner; 2 rows → completed
- [ ] Tap checkbox → complete flow (see 5.5 shared task logic)
- [ ] Completed section below divider (show partner's completions too, including photo thumbnails)
- [ ] Weekly stats bar: completed / total this week

### 5.2 CH-02 Chore Management List
- [ ] Group by frequency: Daily / Weekly / Monthly / Once
- [ ] Each row: name, type icon (👤/🔄/👫), assignee/rotation indicator
- [ ] Tap → CH-03 (edit mode)
- [ ] Swipe or long-press → delete (with confirm)
- [ ] `[+ Add Chore]` → CH-03 (create mode)

### 5.3 CH-03 Add / Edit Chore
- [ ] Name input
- [ ] Task type radio: Personal | Rotation | Shared (👫)
- [ ] Assignee (personal): dropdown of household members
- [ ] Rotation start member (rotation): dropdown + "starts this week" note
- [ ] Frequency: Daily | Weekly | Monthly | Once
- [ ] Due date (date picker): shown only when frequency = **Once**; required; maps to `chore_tasks.due_date DATE`
- [ ] Optional reminder time: time picker
- [ ] Save: `INSERT/UPDATE chore_tasks`

### 5.4 Rotation Logic
- [ ] On each checklist load, compute current responsible user at read time (not stored):
  - `week_index = floor((current_monday_HKT - task.created_at_HKT) / 7)`
  - `responsible = household_members[(week_index + rotation_start_index) % member_count]`
  - Week boundary = Monday 00:00 HKT (`Asia/Hong_Kong`)

### 5.5 Shared Task Completion Logic
- [ ] Each member inserts their **own** `chore_completions` row with `completed_at = NOW()` when they tick
- [ ] "waiting_partner" UI state = exactly 1 row for `(chore_task_id, scheduled_date)` in DB
- [ ] "completed" UI state = 2 rows for `(chore_task_id, scheduled_date)` in DB
- [ ] No UPDATE to existing rows on second tick — partner inserts their own row independently
- [ ] Push notification trigger (P1): after first INSERT on a shared task, send "waiting for you" push to partner

### 5.6 CH-04 Photo Check-in [P1]
- [ ] Tap checkbox → bottom sheet: `[Complete without photo]` + `[📷 Take Photo]` + `[🖼 Choose Photo]`
- [ ] **Two-step flow**: tick first (INSERT with `photo_url = NULL`) → optionally add photo (UPDATE own row to set `photo_url`)
- [ ] Photo: compress to ≤ 500KB client-side (canvas), upload to Supabase Storage (`{household_id}/chores/{task_id}/{scheduled_date}/{user_id}.jpg`)
- [ ] Photo viewable in CH-02 task history (tap task → completion log with thumbnails)

---

## Phase 6: Dashboard (Week 7, second half)
> Depends on Phase 5 (Chores) being complete — chores widget reuses CH-01 query logic

### 6.1 DB-01 Build All Dashboard Widgets

**Today's chores widget**
- [ ] Reuse Phase 5 checklist query; show up to 3 pending tasks inline
- [ ] Tap to tick-complete in-place (same INSERT logic as CH-01)
- [ ] Shared task badge shows "👫 共同任務" + partner completion status
- [ ] "View all" → CH-01

**Daily available amount card**
- [ ] Reuse FI-09 calculation server-side (reads `personal_budgets` + `expenses`)
- [ ] Show amount + progress bar + warning colour
- [ ] Tap → FI-09

**Monthly settlement summary card**
- [ ] Show most recent non-completed settlement: diff amount + who owes whom
- [ ] "去確認" CTA if `finalized_at` IS set and user hasn't confirmed → FI-16
- [ ] Only shown if household has shared expenses this month

**Savings goal progress card**
- [ ] Most recently active `saving_goals` (by last `saving_contributions.created_at`)
- [ ] Show goal name, progress bar, amount/target
- [ ] Tap → FI-11

**Partner activity feed**
- [ ] Query last 10 events from partner: `chore_completions`, `expenses`, `saving_contributions`
- [ ] Render as timeline: "Sam completed 洗衫 📷", "Sam logged Keeta $89", "Sam added $200 to 旅行基金"
- [ ] Real-time update via Supabase Realtime subscription on relevant tables

---

## Phase 7: Profile, Push & PWA Polish (Week 8)

### 7.1 PR-01 Profile / Settings
- [ ] Display name + avatar (upload to Supabase Storage)
- [ ] Notification preferences (per type: chore, partner, settlement) — stored in `household_members.notification_prefs` JSONB
- [ ] Link to FI-05 (payment accounts)
- [ ] App version display
- [ ] Logout → clear Supabase session + redirect `/login`

### 7.2 PR-02 Household Settings + Invite Code
- [ ] Edit household name
- [ ] Member list with avatars
- [ ] Invite code display: show active code or `[Generate New Code]`
- [ ] Code regeneration: `INSERT household_invites` (expires 24h) + show new code
- [ ] Copy / Share (Web Share API)
- [ ] "Leave Household" (destructive): confirm modal → remove from `household_members`; data preserved

### 7.3 Push Notifications [P1]
- [ ] Request push permission on first relevant action (not on login)
- [ ] Store `push_subscriptions` in Supabase (endpoint + keys per user+device)
- [ ] Supabase Edge Function: `send-push-notification`
- [ ] 6 trigger types (PRD 4.3.5 + PRD 8.1):
  - **Chore due**: cron at 08:00 HKT daily → query tasks due today per user
  - **Partner completed chore**: trigger on `INSERT chore_completions`
  - **Shared task waiting**: trigger on first-tick of shared task
  - **Shared task overdue daily reminder** (PRD 8.1): cron daily → query shared tasks where one party ticked but partner has NOT ticked and `scheduled_date < today`; send daily push to the non-completing party until they complete or task is manually closed
  - **Month-end expense reminder**: cron at 28th of month 09:00 HKT → push "本月還有幾天，記得補記支出" (settlement has NOT been finalized yet at this point; this is a last-call expense-logging reminder only)
  - **Settlement finalized — confirm now**: triggered by `monthly-settlement-cron` after `finalize_month_settlement()` returns on the 1st at 09:00 HKT (see Phase 3.7 Step 1) → push "X月結算時間到，快去確認" to both members; **not** a scheduled cron — fired inline after finalization
- [ ] iOS 16.4+ check before registering service worker push

### 7.4 Offline Cache
- [ ] Service worker: cache-first for shell, network-first for data
- [ ] Offline pages: Dashboard, CH-01 (Checklist), FI-01 (Finance Overview), FI-05 (Account List)
- [ ] Show "You're offline — showing cached data" banner when network is unavailable
- [ ] Queue expense inputs while offline; sync on reconnect (IndexedDB queue)

### 7.5 Performance & QA
- [ ] Lighthouse audit: target ≥ 90 on Performance, Accessibility, Best Practices, SEO
- [ ] Image optimisation: `next/image` for all images; compress uploaded photos ≤ 500KB
- [ ] Code splitting: dynamic imports for heavy screens (annual review charts, AI recommendations)
- [ ] Supabase query audit: ensure indexed columns (`household_id`, `user_id`, `date`, `status`)

### 7.6 Security Audit — Operation Matrix + Invariant Verification
> Replaces simple "all 21 tables have CRUD policies" checklist. The system is RPC-first and append-only for financial tables; audit must reflect actual write paths and invariants, not surface-level policy existence. Note: `cron_logs` is intentionally zero-policy for authenticated (service_role only).

**Write path audit** — verify each operation goes through its intended path:
- [ ] `record_expense()` RPC: credit card charges `credit_used_cents`, non-credit charges `balance_cents`; balance/limit guards fire before INSERT; `is_late_adjustment` auto-set correctly
- [ ] `record_saving_contribution()` RPC: `saving_goals.current_amount_cents` updated atomically; credit card rejected; insufficient balance rejected
- [ ] `record_settlement_repayment()` RPC: both `account_events` rows inserted; settlement moves to `completed`; `settlement_status_guard` trigger prevents invalid transitions
- [ ] `finalize_month_settlement()` RPC: `applied_to_settlement_id` set on all late-adjustment items; `settlement_member_totals` written; inaccessible to `authenticated` role (service_role only)
- [ ] `claim_invite()` RPC: invite marked used + member added in one transaction; `household_max_members_check` trigger fires and blocks 3rd member
- [ ] `record_account_transfer()` RPC: deadlock-safe (PERFORM FOR UPDATE in UUID order); credit card destination reduces `credit_used_cents` and writes `credit_repayment` event (not `transfer_in`); non-credit destination increases `balance_cents` and writes `transfer_in`
- [ ] `record_account_credit()` RPC: rejects credit_card accounts; writes `top_up` or `refund` event
- [ ] `record_manual_adjustment()` RPC: rejects credit_card accounts; computes delta; writes `manual_adjustment` event
- [ ] `set_credit_card_used_balance()` RPC: only accepts credit_card accounts; enforces 0 ≤ used ≤ limit; writes `manual_adjustment` event with delta

**Ownership boundary audit** — each actor can only operate on their own data:
- [ ] User A cannot record an expense against User B's `payment_account_id` (both RLS policy and `record_expense()` enforce `user_id = auth.uid()`)
- [ ] User A cannot contribute savings from User B's account (`record_saving_contribution()` + `scon_insert` policy enforce ownership)
- [ ] User A cannot confirm User B's settlement (`sc_insert` policy: `user_id = auth.uid()`)

**Cross-household isolation audit** — two test households, verify zero cross-leakage:
- [ ] User in household A cannot SELECT rows from any of the 21 tables that belong to household B (cron_logs has no rows visible to authenticated users at all)
- [ ] User in household A cannot INSERT into any table with a foreign household_id (all policies + triggers block this)

**DB invariant audit** — invariants enforced at DB layer, not application layer:
- [ ] `settlement_status_guard` trigger: verify invalid transitions raise (e.g., `completed → calculating` fails)
- [ ] `account_owner_membership_check` trigger: payment_account owner must be a household member
- [ ] `chore_task_users_membership_check` trigger: assignee/rotation_start must be household members
- [ ] `household_max_members_check` trigger: 3rd member INSERT raises exception
- [ ] `non_credit_balance_non_negative` constraint: UPDATE that would set balance < 0 raises
- [ ] `credit_card_usage_within_limit` constraint: UPDATE that would exceed credit limit raises
- [ ] `UNIQUE (chore_task_id, scheduled_date, user_id)` on `chore_completions`: duplicate tick INSERT raises

---

## Dependencies Map

```
Phase 0 (Foundation)
  └──> Phase 1 (Onboarding)
        └──> Phase 2 (Finance Core)
              ├──> Phase 3 (Planning & Settlement)
              │     └──> Phase 4 (Analytics)
              │           └──> Phase 5 (Chores) ──> Phase 6 (Dashboard) ──> Phase 7 (Polish)
              └──> Phase 5 (Chores) [can also start here, parallel with Phase 3]
```

**Critical path**: Foundation → Onboarding → Finance Core → Planning → Analytics → Chores → Dashboard → PWA Polish

Phase 5 (Chores) can start in parallel with Phase 3 once Phase 2 is complete.
Phase 6 (Dashboard) **must follow** Phase 5 — the chores widget depends on CH-01 logic.

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Gemini 2.5 Flash latency > 5s SLA | High | Medium | 5s client timeout; immediate fallback to manual form; do not block save flow |
| Gemini cost overrun (OCR per request) | Medium | Medium | ~50 inputs/household/month × cost/call; set monthly budget alert |
| iOS PWA push friction (requires iOS 16.4+ + Add to Home Screen) | Medium | High | Gate push on version check; never block core functionality |
| Supabase Storage costs (1GB free tier) | Low | Medium | Compress photos ≤ 500KB before upload; soft cap per household |
| Monthly settlement cron failure | High | Low | On-demand fallback on FI-16 open; log all Edge Function runs to `cron_logs` |
| Dual-confirmation race condition | Medium | Low | Postgres transaction + UNIQUE constraint on `(settlement_id, user_id)` |
| Floating-point ratio validation errors | Medium | Medium | Store ratios as permille integers (×10 → 1 decimal = 1 permille); compare with ±1 tolerance |
| Rotation task week boundary (HKT midnight) | Low | Low | Always compute from UTC-stored timestamps converted to `Asia/Hong_Kong` |

---

## Feature Priority Summary

| Priority | Features |
|----------|----------|
| **P0** | Auth, Onboarding, AI expense (text+image), Account balance tracking, Personal budget, Ratio planning, Savings goals, Monthly settlement (incl. dispute), Monthly review, Daily chores (3 types), Profile |
| **P1** (all included in v1) | Annual review, AI monthly recommendations, Photo check-in, Push notifications |
| **v1.5+** | Auto savings suggestions, advanced review filtering |
| **v2+** | Sync tasks, email parsing, bank API, multi-member UI |

---

*Based on PRD v1.14 | PAGEFLOW v0.1 | Updated 2026-03-12*
