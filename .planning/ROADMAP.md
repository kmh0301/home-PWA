# Roadmap: Home PWA

**Defined:** 2026-03-13  
**Planning Mode:** Coarse  
**Project:** `/Users/manheiko/Documents/GitHub/home-PWA/.planning/PROJECT.md`

## Coverage Summary

- Total phases: 7
- v1 requirements: 49
- Mapped requirements: 49
- Unmapped requirements: 0
- Coverage: 100%

## Phase 1: Secure Foundation And Household Boundary

**Goal:** Establish the trusted base for a couples-first shared app: authenticated access, protected routes, verified household context, row-level data isolation, and shared time rules anchored to `Asia/Hong_Kong`.

**Mapped requirements (3):** `AUTH-01`, `AUTH-02`, `HOUS-04`

**Success criteria:**
- Users can sign up, sign in, and reopen the app into a persistent authenticated session on protected surfaces.
- Unauthenticated visitors are blocked from household features until a valid session exists.
- Cross-household access is denied across database reads/writes and other household-scoped surfaces, with verified membership driving access instead of client-supplied household IDs.
- Shared month and day boundary helpers used by downstream finance and chore flows are anchored to `Asia/Hong_Kong`.

## Phase 2: Household Onboarding And Shared Membership

**Goal:** Let one partner create the home, invite the other partner, and activate a shared two-person household workspace without breaking membership lifecycle rules.

**Mapped requirements (3):** `HOUS-01`, `HOUS-02`, `HOUS-03`

**Success criteria:**
- A signed-in user can create a new two-person household and become its first active member.
- The household owner can generate or share an invite code that is valid for the intended partner join flow.
- A second signed-in user can join the existing household with a valid invite code and immediately land in the same shared group scope.
- Invite and membership state changes preserve stable member identity for later finance, chore, and notification records.

## Phase 3: AI Expense Capture And Receipt Intake

**Goal:** Deliver the fast bookkeeping loop: users submit text or images, receive AI-generated drafts, confirm or correct every extracted field, and fall back to manual entry when AI is uncertain.

**Mapped requirements (5):** `AICP-01`, `AICP-02`, `AICP-03`, `AICP-04`, `AICP-05`

**Success criteria:**
- Users can submit natural-language expense input and receive a structured draft with amount, date, category, payment account, and summary fields.
- Users can submit receipt photos or payment screenshots and receive OCR-assisted drafts through the same confirmation flow.
- No AI-derived expense can be saved until the user explicitly confirms or edits the extracted fields.
- When AI extraction fails, times out, or is incomplete, users can still finish the entry manually without losing the capture attempt.
- Every saved expense shows a readable summary, and attachment handling stays bounded so offline/cache policy does not silently retain risky full-resolution media everywhere.

## Phase 4: Finance Ledger And Shared Settlement

**Goal:** Build the auditable finance core for couples: accounts, balance events, shared-expense attribution, monthly settlement, repayment, and historical state transitions that stay correct at Hong Kong month boundaries.

**Mapped requirements (12):** `ACCT-01`, `ACCT-02`, `ACCT-03`, `ACCT-04`, `ACCT-05`, `SETL-01`, `SETL-02`, `SETL-03`, `SETL-04`, `SETL-05`, `SETL-06`, `SETL-07`

**Success criteria:**
- Users can create default and custom payment accounts, see balances appropriate to each account type, and understand current balance state from auditable account events.
- All balance-affecting actions create immutable event history rather than silent mutable totals, and linked accounts archive instead of disappearing.
- Shared expenses record payer attribution and feed month-end settlement calculations consistently.
- Settlement snapshots are computed with `Asia/Hong_Kong` month boundaries, require both partners to confirm before repayment, and then complete through a recorded settlement repayment flow.
- Historical settlements expose lifecycle states including `calculating`, `pending repayment`, `completed`, and `disputed`, including the documented timeout path when only one member confirms.

## Phase 5: Planning, Savings, Reviews, And AI Coaching

**Goal:** Turn the ledger into forward-looking household planning with explicit scope boundaries, collaborative copy, savings progress, and explainable monthly coaching that avoids adversarial scorekeeping.

**Mapped requirements (13):** `PLAN-01`, `PLAN-02`, `PLAN-03`, `BUDG-01`, `BUDG-02`, `SAVE-01`, `SAVE-02`, `SAVE-03`, `REVI-01`, `REVI-02`, `AICO-01`, `AICO-02`, `AICO-03`

**Success criteria:**
- Users can create, version, and apply monthly plans whose category ratios and savings ratio resolve into target amounts without scope ambiguity.
- Personal budgets only count personal expenses, while savings goals track contribution progress and preserve per-member contribution history for shared goals.
- Monthly and yearly review surfaces show actual-versus-target performance, trend summaries, and reduced states when history is incomplete.
- AI coaching produces monthly guidance with a one-line summary, category recommendations, proposed savings-ratio adjustment, explicit calculation scope, confidence, and supporting data points.
- Planning, review, and coaching copy emphasize shared clarity and next actions rather than partner ranking or scorekeeping.

## Phase 6: Chores And Household Dashboard

**Goal:** Make the app feel useful every day by combining chore execution, joint-task collaboration, partner activity, and dashboard summaries into one couples-first household operating view.

**Mapped requirements (10):** `DASH-01`, `DASH-02`, `DASH-03`, `DASH-04`, `CHOR-01`, `CHOR-02`, `CHOR-03`, `CHOR-04`, `CHOR-05`, `CHOR-06`

**Success criteria:**
- Users can create and manage personal, rotating, and joint chores with recurrence, responsibility rules, and optional reminder times.
- Today’s chore checklist clearly shows pending, completed, and waiting-for-partner states, with joint chores only completing after both members confirm.
- Optional proof photos attach to completion records without breaking later review or privacy expectations.
- The dashboard combines today’s chores, personal available budget, current settlement summary, savings progress, and recent partner activity in one readable household status view.
- Dashboard and activity surfaces summarize collaboration without turning chores or finances into competitive scoring.

## Phase 7: PWA Reliability And Notifications

**Goal:** Harden the app for real mobile use with installability, cached offline reads, and privacy-aware reminders that respect platform limits and sensitive household context.

**Mapped requirements (3):** `NOTF-01`, `PWA-01`, `PWA-02`

**Success criteria:**
- Users can install the app as a PWA on supported devices and return to it as an app-like experience.
- Cached dashboard, chore-list, and finance-list views remain readable during temporary offline periods, while sensitive finance mutations stay conservative rather than silently reconciling risky writes.
- Reminder delivery supports chores, joint-task follow-ups, partner completion events, and settlement actions where push is available, with device capability checks and privacy-safe notification content.

## Requirement Distribution

| Phase | Requirement count |
|-------|-------------------|
| Phase 1 | 3 |
| Phase 2 | 3 |
| Phase 3 | 5 |
| Phase 4 | 12 |
| Phase 5 | 13 |
| Phase 6 | 10 |
| Phase 7 | 3 |

## Validation

- Exact v1 requirement count checked against `REQUIREMENTS.md`: 49
- Requirements mapped to exactly one phase: 49
- Duplicate mappings across phases: 0
- Unmapped requirements: 0
- Coverage result: 100%

---
*Last updated: 2026-03-13 after roadmap creation*
