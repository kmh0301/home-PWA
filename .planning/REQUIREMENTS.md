# Requirements: Home PWA

**Defined:** 2026-03-13
**Core Value:** Two people can run a home together with shared clarity, not guesswork, across money and chores.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up and log in to the app with a persistent authenticated session.
- [ ] **AUTH-02**: User can access protected household features only after authentication.

### Household

- [ ] **HOUS-01**: User can create a household group for a two-person home.
- [ ] **HOUS-02**: User can generate or share an invite code so a partner can join the same household.
- [ ] **HOUS-03**: User can join an existing household with a valid invite code.
- [ ] **HOUS-04**: All household data is scoped to the current household membership and isolated from other households.

### Dashboard

- [ ] **DASH-01**: User can open a dashboard that shows today’s outstanding chores for self and joint tasks.
- [ ] **DASH-02**: User can see today’s personal available budget with warning status on the dashboard.
- [ ] **DASH-03**: User can see the current month shared-settlement summary on the dashboard.
- [ ] **DASH-04**: User can see current savings-goal progress and recent partner household activity on the dashboard.

### AI Expense Capture

- [ ] **AICP-01**: User can submit natural-language expense input and receive extracted amount, date, category, payment account, and spending summary draft.
- [ ] **AICP-02**: User can submit a receipt photo or payment screenshot and receive OCR-assisted extracted amount, date, category, payment account, and spending summary draft.
- [ ] **AICP-03**: User must confirm or edit all AI-extracted expense data before the transaction is saved.
- [ ] **AICP-04**: User can still complete expense entry manually when AI extraction fails or is incomplete.
- [ ] **AICP-05**: User sees a readable spending summary for every saved transaction, with optional line-item detail when source data is sufficient.

### Expense And Account Ledger

- [ ] **ACCT-01**: User can create default payment accounts for Alipay HK, PayMe, cash, and credit card, plus custom payment accounts.
- [ ] **ACCT-02**: User can set and view account balances appropriate to each account type, including remaining available credit for credit cards.
- [ ] **ACCT-03**: User can record balance-affecting account events for spending, deposit/top-up, refund, account transfer, credit-card repayment, settlement repayment, savings contribution, and manual adjustment.
- [ ] **ACCT-04**: User can review an auditable event history that explains current account balances.
- [ ] **ACCT-05**: Linked accounts with historical events are archived instead of hard-deleted.

### Shared Finance And Settlement

- [ ] **SETL-01**: User can classify each expense as personal or shared household spending.
- [ ] **SETL-02**: User can record the paying member for shared expenses and include shared expenses in monthly settlement calculations.
- [ ] **SETL-03**: User can see a month-end settlement amount calculated in `Asia/Hong_Kong` time from that month’s shared expenses.
- [ ] **SETL-04**: Both household members can confirm the calculated settlement amount before it is locked into a pending-repayment state.
- [ ] **SETL-05**: User can record a settlement repayment between member accounts and complete the settlement lifecycle.
- [ ] **SETL-06**: User can see historical settlement records and current settlement status transitions, including `calculating`, `pending repayment`, `completed`, and `disputed`.
- [ ] **SETL-07**: User encounters the documented timeout and dispute flow when only one member confirms before the next-month deadline.

### Planning, Budgeting, And Savings

- [ ] **PLAN-01**: User can create a monthly spending plan with a target savings ratio and category ratios that must total 100% within the defined tolerance.
- [ ] **PLAN-02**: User can choose whether a plan applies to the current month or next month and can replace the active version while keeping version history.
- [ ] **PLAN-03**: User can apply a planning template and view target category amounts and target savings amount derived from the saved ratios.
- [ ] **BUDG-01**: User can set a monthly personal budget that only counts personal expenses.
- [ ] **BUDG-02**: User can see used budget, remaining budget, and today’s available spend amount with warning states.
- [ ] **SAVE-01**: User can create personal or shared savings goals with a target amount and current progress.
- [ ] **SAVE-02**: User can contribute money to a savings goal from a payment account and update both account balance and savings progress.
- [ ] **SAVE-03**: User can review contribution history and per-member contribution totals for shared savings goals.

### Reviews And AI Coaching

- [ ] **REVI-01**: User can view a monthly review that shows actual spending by category, target-vs-actual differences, and top overspend and underspend categories.
- [ ] **REVI-02**: User can view a yearly review with 12-month trends, savings-rate trend, category variation, and annual target-hit rate, with reduced views when insufficient history exists.
- [ ] **AICO-01**: User receives a monthly AI coaching output that includes a one-line summary, category-level recommendations, a proposed savings-ratio adjustment, and up to three concrete actions.
- [ ] **AICO-02**: Each AI coaching recommendation identifies its calculation scope, confidence level, and at least two supporting data points.
- [ ] **AICO-03**: Monthly AI coaching is generated automatically at the start of the month, recalculated on first finance-page visit if background generation fails, and can be manually regenerated while preserving the latest history.

### Chores

- [ ] **CHOR-01**: User can create chore tasks with name, type, frequency, responsible member model, and optional reminder time.
- [ ] **CHOR-02**: User can manage personal chores, rotating chores, and joint chores from the household chore system.
- [ ] **CHOR-03**: User can see today’s chore checklist with pending and completed states.
- [ ] **CHOR-04**: Rotating chores automatically assign the responsible member according to the defined recurrence rules.
- [ ] **CHOR-05**: Joint chores only complete after both household members confirm completion, with an intermediate waiting-for-partner state after the first completion.
- [ ] **CHOR-06**: User can complete a chore with an optional photo proof that is stored with the completion record and viewable later.

### Notifications And PWA Reliability

- [ ] **NOTF-01**: User can receive reminders for due chores, partner chore completions, joint chores waiting on the other member, and month-end settlement actions where push is supported.
- [ ] **PWA-01**: User can install the app as a PWA on supported devices.
- [ ] **PWA-02**: User can open cached dashboard, chore-list, and finance-list views when temporarily offline.

## v2 Requirements

### Household Expansion

- **HOUS-05**: User can run household workflows with more than two active members under updated business rules.

### Finance Expansion

- **FINX-01**: User can forward notification emails for automatic expense parsing after technical feasibility is validated.
- **FINX-02**: User can manage recurring expenses and richer financial reporting.
- **FINX-03**: User can use advanced split rules such as percentage-based or multi-line-item shared allocations.
- **FINX-04**: User can receive automatic suggestions to move leftover budget into savings goals.

### Chore Expansion

- **CHRX-01**: User can manage synchronous chores where multiple members complete different sub-roles at the same time.

### Adjacent Modules

- **ADJ-01**: User can manage shopping lists tied to household coordination.
- **ADJ-02**: User can manage household calendar and scheduling workflows.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native iOS or Android apps | PWA-first delivery is the explicit platform decision for v1. |
| Direct bank API sync | High complexity and support burden that do not validate the core v1 thesis. |
| Autonomous AI expense posting without user confirmation | Violates the required trust and audit model for finance. |
| Gamified chore points or partner scoreboards | Conflicts with the anti-scorekeeping product positioning. |
| Generic multi-member household business logic | The v1 product and settlement/chore rules are intentionally optimized for couples. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Unmapped | Pending |
| AUTH-02 | Unmapped | Pending |
| HOUS-01 | Unmapped | Pending |
| HOUS-02 | Unmapped | Pending |
| HOUS-03 | Unmapped | Pending |
| HOUS-04 | Unmapped | Pending |
| DASH-01 | Unmapped | Pending |
| DASH-02 | Unmapped | Pending |
| DASH-03 | Unmapped | Pending |
| DASH-04 | Unmapped | Pending |
| AICP-01 | Unmapped | Pending |
| AICP-02 | Unmapped | Pending |
| AICP-03 | Unmapped | Pending |
| AICP-04 | Unmapped | Pending |
| AICP-05 | Unmapped | Pending |
| ACCT-01 | Unmapped | Pending |
| ACCT-02 | Unmapped | Pending |
| ACCT-03 | Unmapped | Pending |
| ACCT-04 | Unmapped | Pending |
| ACCT-05 | Unmapped | Pending |
| SETL-01 | Unmapped | Pending |
| SETL-02 | Unmapped | Pending |
| SETL-03 | Unmapped | Pending |
| SETL-04 | Unmapped | Pending |
| SETL-05 | Unmapped | Pending |
| SETL-06 | Unmapped | Pending |
| SETL-07 | Unmapped | Pending |
| PLAN-01 | Unmapped | Pending |
| PLAN-02 | Unmapped | Pending |
| PLAN-03 | Unmapped | Pending |
| BUDG-01 | Unmapped | Pending |
| BUDG-02 | Unmapped | Pending |
| SAVE-01 | Unmapped | Pending |
| SAVE-02 | Unmapped | Pending |
| SAVE-03 | Unmapped | Pending |
| REVI-01 | Unmapped | Pending |
| REVI-02 | Unmapped | Pending |
| AICO-01 | Unmapped | Pending |
| AICO-02 | Unmapped | Pending |
| AICO-03 | Unmapped | Pending |
| CHOR-01 | Unmapped | Pending |
| CHOR-02 | Unmapped | Pending |
| CHOR-03 | Unmapped | Pending |
| CHOR-04 | Unmapped | Pending |
| CHOR-05 | Unmapped | Pending |
| CHOR-06 | Unmapped | Pending |
| NOTF-01 | Unmapped | Pending |
| PWA-01 | Unmapped | Pending |
| PWA-02 | Unmapped | Pending |

**Coverage:**
- v1 requirements: 49 total
- Mapped to phases: 0
- Unmapped: 49 ⚠️

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-13 after initial definition*
