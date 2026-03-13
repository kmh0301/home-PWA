# Feature Research: v1 Household Collaboration for Couples

Date: 2026-03-13
Project: Home PWA
Source brief: `.planning/PROJECT.md`, `docs/PRD.md`, `docs/plans/PROJECT-PLAN.md`

## Goal

Define the right v1 feature set for a two-person household collaboration product that combines shared finance and chores without turning into either:

- a generic expense splitter with a chores tab bolted on, or
- a chores app with shallow money widgets.

The product should feel like a single household operating system for couples: clear status, low friction input, fair settlement, visible shared work, and a tone that reduces conflict instead of encouraging scorekeeping.

## Research Summary

The market already covers individual pieces of this problem well:

- `Splitwise` establishes the baseline for shared expense tracking, balances, and repayments.
- `Honeydue` establishes the baseline for couples-oriented finance, bill reminders, and chat-like coordination.
- `Tody` and `Sweepy` establish the baseline for household task management, recurring chores, rotation, reminders, and household cleanliness visibility.

What is still weak in the market is a product that treats money and chores as one shared household state for a couple. That is the opening for Home PWA.

The implication for v1 is straightforward:

- Finance and chores each need to clear their category table stakes.
- The real differentiation must come from the combined experience, not from trying to out-feature specialists on every axis in v1.
- The biggest v1 risk is scope creep inside finance, because finance already contains enough complexity for a standalone product.

## Product Positioning

### Core promise

Two people can run a home together with shared clarity across spending, settlement, savings, and chores.

### Product thesis

Existing products usually optimize one of these jobs:

- split costs fairly
- manage personal/shared money
- keep chores from being forgotten

Home PWA should optimize a different job:

- help a couple understand whether the home is on track today

That makes the home dashboard, shared activity feed, joint-task model, and explainable monthly guidance more important than adding long-tail finance or chore features.

## v1 Feature Framework

### 1. Table Stakes

These are the features users will simply expect if they try a household collaboration app in this category. Missing any of them weakens trust immediately.

#### Household setup and shared scope

- Create household
- Invite partner
- Shared household data scope
- Clear member identity and permissions
- Fast onboarding with sensible default account/task templates

Why it matters:

- Couples products fail quickly if setup feels like business software.
- Shared context is the foundation for every later feature and for RLS/security.

#### Shared finance basics

- Fast expense capture
- Personal vs shared expense type
- Per-person payer attribution
- Running shared balance / who paid more this month
- Monthly settlement flow
- Repayment recording
- History/audit trail

Why it matters:

- This is the minimum credible finance layer for couples.
- Without an auditable path from expense to settlement to repayment, users stop trusting totals.

#### Account visibility

- Manual account setup
- Balance tracking for common payment accounts
- Event history for balance changes
- Manual adjustment and transfer support

Why it matters:

- For the target Hong Kong use case, money is fragmented across wallet-like payment methods and cards.
- Users need “reference truth” even without bank sync.

#### Chore basics

- Today view
- Recurring chores
- Rotation chores
- Personal assignment
- Completion history
- Reminders

Why it matters:

- Chores only work if today’s next action is obvious.
- Specialist chore apps have already trained users to expect recurrence and rotation.

#### Mobile-PWA practicality

- Installable PWA
- Fast load on phone
- Offline cached list views
- Push notifications where supported
- Camera/image upload flows that work reliably on mobile

Why it matters:

- This product is used in kitchens, stores, transport, and while multitasking.
- If capture is brittle on mobile, the habit breaks.

### 2. Differentiators Worth Building in v1

These are the features that make Home PWA distinct enough to win attention and retention.

#### Combined household dashboard

The opening screen should answer:

- What must we do today?
- Are we okay financially this month?
- Is one of us waiting on the other for a settlement or a joint chore?

This is more differentiated than deep analytics because it converts two utilities into one daily habit.

#### Joint chores that require both people to complete

The PRD is right to treat this as non-negotiable. Most chore products handle assignment and reminders. Very few make “we do this together” a first-class state machine. For couples, this is strategically important because it aligns the product with collaboration rather than delegation.

#### AI-assisted expense capture with mandatory confirmation

The strongest v1 AI use is not autonomous finance. It is speed plus comprehension:

- parse text or receipt/screenshot
- infer amount/date/account/category
- generate a readable spending summary
- require explicit confirmation before save

This is differentiated because it reduces logging friction without asking users to trust opaque automation with money.

#### Explainable monthly coaching

The right v1 version is not a broad “financial advisor.” It is a compact monthly coach that:

- uses explicit scope labels
- references actual spending data
- recommends concrete budget/savings adjustments
- explains why

This reinforces the product’s positioning as a household operating system instead of a ledger.

#### Anti-scorekeeping tone and flows

This matters more than it sounds. The product should visibly avoid:

- points
- leaderboards
- punitive nudges
- “who is better” framing

Instead it should emphasize:

- pending together
- waiting for partner
- home status
- next useful action

This is both a UX differentiator and a scope control mechanism.

#### Hong Kong-localized household finance defaults

Local payment account presets, Hong Kong timezone rules, and copy that assumes wallet/card/manual balance tracking are meaningful advantages for the target audience. They are not flashy, but they increase day-1 relevance.

### 3. Anti-Features for v1

These should be explicitly avoided because they increase complexity faster than they increase validation value.

#### Do not add direct bank sync

Why to avoid:

- expensive and region-specific
- creates support burden and trust expectations
- not required to validate the core household-collaboration thesis

Keep v1 on manual account events and reference balances.

#### Do not expand to generic multi-member households in product logic

Why to avoid:

- settlement math, copy, reminders, and joint-task semantics all become materially harder
- most of the current product promise is about couples, not generic groupware

Keep the data model extensible, but keep business rules explicitly two-person.

#### Do not build a shopping list or calendar module

Why to avoid:

- these are adjacency features with large UI and notification surface area
- they dilute the core “money + chores” product loop

Treat them as future integrations or future modules, not part of v1.

#### Do not add gamified chore scoring

Why to avoid:

- conflicts with the anti-scorekeeping positioning
- creates fairness arguments rather than reducing them

#### Do not support automatic AI posting of financial records

Why to avoid:

- trust and correctness risk is too high
- error recovery becomes much harder once balances and settlements derive from bad data

Mandatory confirmation is the correct v1 boundary.

#### Do not add complex splitting models

Examples:

- percentage-based splits by category
- per-line-item multi-person allocation
- exceptions by date/person/rule

Why to avoid:

- turns v1 into a sophisticated finance engine before the combined household behavior is validated

For v1, equal split for shared household expenses is enough.

#### Do not add chat as a primary product surface

Activity visibility is good. A full conversation system is not.

Why to avoid:

- duplicates existing messaging behavior
- creates moderation, notification, and retention complexity
- distracts from actionable household state

## Recommended v1 Feature Set

### Must have

- Household creation, invite, and shared data scope
- AI-assisted text expense capture with confirmation
- AI-assisted receipt/screenshot capture with confirmation
- Personal vs shared expenses
- Account setup for common payment methods and manual balance tracking
- Monthly shared settlement with dual confirmation and repayment recording
- Today view for chores
- Personal chores, rotating chores, and joint chores
- Dashboard that combines chores, settlement status, savings progress, and partner activity
- Personal budget and daily allowance
- Savings goals with contribution history
- Monthly review and lightweight AI monthly recommendations
- Notifications for chore reminders, partner completion, and settlement reminders
- Offline-capable cached list views

### Should have if the team can carry the complexity

- Chore photo proof
- Settlement dispute handling after missed confirmation windows
- Simple duplicate-expense detection
- Background month-start AI recommendation generation with on-demand fallback

### Defer

- Annual review depth beyond a lightweight trend view
- Advanced analytics and charts
- Email parsing
- Recurring transactions
- Subscription tracking
- Calendar/scheduling
- Shopping lists
- Multi-member household business rules
- Bank/API sync
- Shared household chat

## Complexity Assessment

The project’s hardest problem is not UI breadth. It is the number of stateful, auditable workflows that interact with each other.

### Highest complexity areas

#### 1. Shared finance ledger and settlement

Complexity: Very high

Why:

- settlement state machine
- month boundaries in `Asia/Hong_Kong`
- locked months and late adjustments
- repayment event handling across two accounts
- dispute states and reminders
- trust-sensitive calculations

This is the single biggest source of correctness risk.

#### 2. Account event model

Complexity: High

Why:

- all balance-affecting actions need auditability
- expenses, transfers, refunds, credit-card repayment, settlement repayment, and savings contributions all touch balances differently
- bugs here quietly poison every downstream feature

#### 3. AI expense extraction

Complexity: High

Why:

- multi-modal input
- OCR variability
- account inference
- duplicate detection
- confidence handling
- need to remain fast enough for habit formation

The product does not need perfect extraction, but it does need graceful failure and fast confirmation.

#### 4. Recurring/rotation/joint chore engine

Complexity: Medium to high

Why:

- recurrence rules
- weekly rotation logic
- dual completion states
- overdue reminders
- household timezone dependency

Joint chores are strategically important but operationally tricky.

#### 5. AI monthly coaching

Complexity: Medium to high

Why:

- needs trustworthy input snapshots
- recommendations must be explainable
- scope definitions must stay consistent across planning/review/AI

This is a differentiation layer, but only if the underlying finance summaries are already correct.

#### 6. Offline sync for capture flows

Complexity: Medium to high

Why:

- queued writes
- image handling
- duplicate prevention on reconnect
- stale dashboard/list data expectations

Worth doing for cached views and simple queued inputs, but keep the offline model narrow in v1.

### Lower complexity areas

- Household onboarding and invite code flows
- Dashboard composition once data contracts exist
- Savings goals basic CRUD and contributions
- Personal budget calculation once expense typing is stable

These are still meaningful, but they are less risky than ledger correctness and AI-assisted capture.

## Dependency Map

### Foundational dependencies

These must exist before most product features are credible.

#### Product/data foundations

- Supabase Auth
- household membership model
- RLS policies
- dynamic member references
- core audit tables and immutable event patterns

#### Frontend/platform foundations

- Next.js PWA shell
- installability/service worker
- mobile-safe forms
- camera/file upload flows
- optimistic but recoverable mutation patterns

#### Infrastructure foundations

- object storage for receipts/chore images
- background job execution for settlement/monthly AI/reminders
- push notification infrastructure
- analytics and event instrumentation

### Feature dependencies by area

#### AI expense capture depends on

- household membership
- payment accounts
- image upload/storage
- AI provider integration
- confirmation form UI
- expense persistence plus account-event write

#### Monthly settlement depends on

- correct shared expense typing
- payer attribution
- month locking rules
- notification jobs
- repayment event handling
- dispute/timeout rules if included

#### Personal budget and monthly review depend on

- correct classification of personal vs shared spend
- stable category taxonomy
- monthly plan storage
- reliable monthly aggregation

#### Savings goals depend on

- payment accounts
- account-event ledger
- household scope and contribution attribution

#### Chores depend on

- household membership
- recurrence generation
- notification scheduling
- completion history
- optional photo storage

#### Dashboard depends on

- every other domain exposing narrow, reliable summary queries

This is important: the dashboard should be built late in implementation order but early in product importance.

## Recommended Delivery Shape

If the team wants to protect v1 quality, features should be treated in this order:

### Phase 1: Trust foundations

- Auth and household setup
- payment accounts and audit model
- expense creation and storage
- core chore task model

### Phase 2: Core loops

- AI expense capture with confirmation
- monthly shared settlement
- today chores with personal/rotation/joint types

### Phase 3: Daily value layer

- dashboard
- budget and daily allowance
- savings goals
- partner activity feed

### Phase 4: Intelligence and polish

- monthly review
- AI monthly coaching
- push notifications
- photo proof
- narrow offline queueing

This sequence reduces the risk of building polished surfaces on top of untrustworthy financial data.

## Feature Decisions

| Area                                | v1 Decision                            | Reason                                           |
| ----------------------------------- | -------------------------------------- | ------------------------------------------------ |
| Shared expense tracking             | Include                                | Table stakes for couples finance                 |
| Monthly settlement                  | Include                                | Core fairness loop                               |
| Repayment recording                 | Include                                | Needed to close the loop and maintain trust      |
| Account balance tracking            | Include                                | Important for HK wallet/card reality             |
| AI text/image expense capture       | Include                                | Key input-speed differentiator                   |
| Daily chores with recurrence        | Include                                | Table stakes for chores                          |
| Joint chores                        | Include                                | Core differentiation and positioning proof       |
| Dashboard with combined home status | Include                                | Best proof of the “one household system” thesis  |
| Monthly AI coaching                 | Include, but narrow                    | Differentiation only if concise and explainable  |
| Photo proof for chores              | Optional/P1                            | Useful but not core to validation                |
| Dispute workflow                    | Include if already designed in backend | Finance trust issue; can be lightweight UI first |
| Annual review depth                 | Defer/P1                               | Nice to have, not core to the household loop     |
| Bank sync                           | Exclude                                | Too much complexity for v1 learning              |
| Shopping list                       | Exclude                                | Adjacent, dilutes core loop                      |
| Calendar/scheduling                 | Exclude                                | Large surface, weak for core validation          |
| Multi-member business logic         | Exclude                                | Breaks product focus and complexity budget       |
| Gamified points/leaderboards        | Exclude                                | Conflicts with non-scorekeeping positioning      |
| Full chat                           | Exclude                                | Low leverage relative to complexity              |

## Strategic Guidance

The biggest opportunity is not “all household features in one app.” That framing produces a bloated roadmap and weak first-run clarity.

The better framing is:

- best-in-class enough at shared finance
- best-in-class enough at practical chores
- uniquely good at showing the combined state of a couple’s home

For v1, every feature should be tested against one question:

Does this help a couple understand and coordinate the household this week?

If not, it is probably a defer.

## Source Notes

Internal sources reviewed:

- `.planning/PROJECT.md`
- `docs/PRD.md`
- `docs/plans/PROJECT-PLAN.md`
- `docs/plans/DB-SCHEMA.sql`

External product references reviewed:

- Splitwise: https://www.splitwise.com/
- Honeydue: https://www.honeydue.com/
- Tody: https://todyapp.com/
- Sweepy: https://sweepy.app/

Interpretation note:

The conclusion that there is whitespace in the market is an inference from these category patterns and from the project brief, not a direct claim made by any one source.
