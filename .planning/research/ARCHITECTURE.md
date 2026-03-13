# Architecture Research

## Purpose

This document defines the recommended system architecture for Home PWA: a mobile-first household collaboration PWA for two-person households that combines shared finance, chore coordination, and AI-assisted bookkeeping. It is aligned to `.planning/PROJECT.md`, the current Next.js + Supabase baseline, and the source planning artifacts in `docs/plans/`.

The architecture is optimized for:

- strict household data isolation
- auditable financial mutations
- fast AI-assisted capture with explicit user confirmation
- reliable recurring household automation in `Asia/Hong_Kong`
- offline-friendly read access with controlled deferred writes

## Architectural Principles

1. Household scope is the primary tenant boundary.
2. Finance writes are RPC-first and append-only where possible.
3. AI output is advisory until a user confirms it.
4. Reads can be flexible; money-moving writes cannot.
5. Background automation must be idempotent and timezone-aware.
6. Offline support should favor cached reads and queued low-risk writes, not hidden reconciliation.
7. The product is couples-first in v1; do not dilute architecture around future multi-member requirements yet.

## Recommended Stack

- Frontend shell: Next.js App Router, React 19, TypeScript
- UI delivery: installable PWA using `@ducanh2912/next-pwa`
- Backend platform: Supabase
- Database: PostgreSQL with Row Level Security and SECURITY DEFINER RPCs
- Auth: Supabase Auth
- Object storage: Supabase Storage for receipts, avatars, and optional chore proof photos
- Realtime: Supabase Realtime for partner activity and settlement/dispute updates
- AI extraction: server-side API routes calling Gemini 2.5 Flash
- Background jobs: Supabase Edge Functions invoked by cron and event-triggered server paths
- Hosting: Vercel for web app, Supabase for data/auth/storage/functions

## System Context

The system should be split into six runtime layers:

1. Client application layer
2. Next.js server application layer
3. Database and storage layer
4. Background jobs layer
5. AI processing layer
6. Notification and sync layer

Each layer has a distinct trust boundary and failure mode.

## Component Boundaries

### 1. Client Application Layer

The client should remain a thin orchestration layer. It handles rendering, optimistic local state, capture UX, offline cache access, and explicit confirmation flows. It should not contain settlement arithmetic, ownership checks, or balance mutation logic.

Recommended client modules:

- `app-shell`
  - navigation, protected layout, install prompts, offline banner
- `onboarding`
  - create household, join via invite, initial account setup
- `finance-entry`
  - text input, receipt image input, AI confirmation form, duplicate warning
- `finance-accounts`
  - account list, account detail, transfer and adjustment forms
- `finance-planning`
  - monthly plans, budgets, savings goals, settlement screens
- `chores`
  - checklist, management, task creation/editing, completion flows
- `dashboard`
  - summarized household status assembled from domain queries
- `insights`
  - monthly review, annual review, AI recommendation display
- `sync-client`
  - IndexedDB cache, offline mutation queue, reconnect handling

Client responsibilities:

- collect user intent
- display server-derived truth
- queue selected offline-safe actions
- surface AI confidence and required review states
- never directly persist AI extraction results without user action

### 2. Next.js Server Application Layer

This layer should be the application boundary between UI and Supabase. It owns route protection, composition of server-side reads, API routes for AI and upload preparation, and server actions for low-complexity workflows.

Recommended modules:

- `auth-and-session`
  - Supabase SSR helpers, middleware, session lookup
- `household-context`
  - resolves current user, membership, and active household context
- `read-models`
  - dashboard queries, finance overview queries, chore checklist queries
- `command-handlers`
  - onboarding server actions and other non-sensitive orchestration
- `ai-api`
  - `/api/ai/parse-expense`
  - `/api/ai/monthly-recommendations`
- `upload-api`
  - signed upload paths, client-side storage constraints, image validation hints
- `realtime-bootstrap`
  - channel configuration, channel naming conventions, subscription filters

This layer should avoid duplicating invariants already guaranteed in Postgres. It may pre-validate for UX, but the database remains the source of enforcement.

### 3. Database and Storage Layer

This is the core trust layer. It owns household isolation, financial correctness, lifecycle state transitions, and durable audit history.

Recommended database domains:

- `identity-and-households`
  - `households`
  - `household_members`
  - `household_invites`
- `finance-ledger`
  - `payment_accounts`
  - `account_events`
  - finance RPCs for transfer, repayment, adjustment, credit
- `expenses`
  - `expenses`
  - `expense_line_items`
  - `record_expense()`
- `planning-and-savings`
  - `monthly_plans`
  - `personal_budgets`
  - `saving_goals`
  - `saving_contributions`
  - `record_saving_contribution()`
- `settlement`
  - `monthly_settlements`
  - `settlement_member_totals`
  - `settlement_confirmations`
  - `dispute_proposals`
  - `finalize_month_settlement()`
  - `record_settlement_repayment()`
- `reviews-and-ai`
  - `monthly_reviews`
  - `ai_monthly_recommendations`
- `chores`
  - `chore_tasks`
  - `chore_completions`
- `notifications-and-ops`
  - `push_subscriptions`
  - `cron_logs`

Storage buckets should be split by asset class:

- `receipts`
- `chore-proofs`
- `avatars`

Recommended path convention:

- receipts: `{household_id}/expenses/{expense_id}/{file_id}.jpg`
- chores: `{household_id}/chores/{task_id}/{scheduled_date}/{user_id}.jpg`
- avatars: `{household_id}/avatars/{user_id}/{file_id}.jpg`

### 4. Background Jobs Layer

Background jobs should run only for:

- monthly settlement finalization
- monthly review snapshot generation
- AI recommendation generation
- push reminder fan-out
- cleanup and observability tasks

These jobs should live in Supabase Edge Functions and use `service_role`. They must write execution logs to `cron_logs` and be safe to retry.

### 5. AI Processing Layer

AI should be isolated behind server-owned API routes. The client may upload text or an image, but the model prompt, validation, normalization, timeout behavior, and cost controls belong server-side.

### 6. Notification and Sync Layer

Push delivery and realtime subscriptions should remain separate concerns:

- Realtime is for in-app synchronization while online.
- Push is for out-of-app reminders and prompts.

Do not depend on push to complete core workflows.

## Data Flow

### A. Authentication and Household Resolution

1. User authenticates via Supabase Auth.
2. Middleware gates protected routes.
3. Server resolves `auth.user`.
4. Server resolves `household_members` row for current user.
5. App selects one household context for v1 because the model is couples-only.
6. All subsequent reads and writes are household-scoped.

### B. Onboarding Flow

1. User creates or joins a household.
2. Household membership is persisted.
3. Initial payment accounts are created.
4. Opening balances are written through RPC-backed account events, not silent direct balance mutation.
5. Onboarding state is considered complete once membership exists and account setup is explicitly completed or skipped.

### C. Expense Capture Flow

1. User submits text or receipt image.
2. Next.js API route validates payload size and type.
3. API route calls AI extraction service.
4. AI returns structured extraction plus field-level confidence.
5. Server normalizes output into app schema shape.
6. Client renders confirmation form with editable fields.
7. User confirms and submits.
8. Server calls `record_expense()` RPC.
9. RPC atomically inserts expense, mutates the owning account, and appends account event(s).
10. Optional line items are inserted after the core expense transaction succeeds.

### D. Account Operation Flow

1. User initiates top-up, refund, transfer, repayment, or manual adjustment.
2. Client posts command intent.
3. Server invokes the specific RPC.
4. RPC verifies household scope, account ownership, and balance/credit constraints.
5. RPC writes immutable `account_events` entries and updates account state atomically.

### E. Settlement Flow

1. During the month, shared expenses contribute to a live tally.
2. At month start, a cron-triggered function finalizes the previous month.
3. Finalization writes a locked snapshot into settlement tables.
4. Each member confirms.
5. Once both confirm, status becomes `pending_repayment`.
6. Payer records repayment through RPC.
7. RPC moves funds and marks settlement `completed`.
8. If confirmation deadlines expire, the settlement moves to `disputed`.

### F. Chore Flow

1. Client requests today’s checklist.
2. Server composes tasks due today using recurrence rules and HKT date logic.
3. Personal and rotation tasks are single-completion.
4. Shared tasks are dual-completion with one row per member.
5. Completion writes go directly to table inserts subject to RLS and uniqueness constraints.
6. Optional photo upload is a second step after completion.

### G. Dashboard Flow

The dashboard should be a read-model surface, not a domain owner. It composes:

- today’s chores
- daily available amount
- current settlement status
- active savings goal progress
- partner activity feed

Each widget should read from the owning domain’s query model rather than recreating domain logic inside dashboard code.

## Security Model

### Tenant Boundary

The security boundary is the household. Every persisted row must be attributable to exactly one household, except where the record is intentionally user-global under auth.

### Primary Enforcement

Use three layers together:

1. Supabase Auth for identity
2. RLS for read/write scoping
3. SECURITY DEFINER RPCs for cross-table financial commands

### Authorization Rules

- Users may read only rows in their household.
- Users may mutate only rows allowed by both household scope and ownership rules.
- Finance operations that affect balances must verify account ownership, not just shared household membership.
- Service-role functions are reserved for cron, AI post-processing persistence, and notification fan-out.

### Direct Table Writes vs RPCs

Allowed as direct table writes:

- low-risk onboarding inserts where no existing balance state is being mutated
- household-scoped records with simple invariants
- chore completion inserts
- settlement confirmation inserts

Must be RPC-backed:

- expense recording
- account transfers
- credit repayments
- balance adjustments
- savings contributions
- settlement repayment
- settlement finalization
- invite claiming when membership and invite state must update together

### AI Safety Rules

- AI output must never write finance rows directly.
- AI extraction results remain transient until user confirmation.
- Monthly recommendation generation may persist AI output only from a service-owned path after deterministic input assembly and schema validation.
- Explainability is required: store enough structured evidence to explain why a recommendation was produced.

### Storage Security

- Storage object paths must include `household_id`.
- Upload permission should be restricted to authenticated members of that household.
- Use client-side compression before upload and validate MIME/size server-side.
- Sensitive receipt images should not be public buckets.

### Secrets and Privileged Code

- Only server routes and Edge Functions may hold AI API credentials or service-role keys.
- Client code may use only the public Supabase URL and anon key.

## Background Jobs

### 1. Monthly Settlement Cron

Schedule:

- `09:00 HKT` on the 1st of each month

Responsibilities:

- finalize previous month’s settlement per household
- absorb pending late adjustments
- create current month settlement row if missing
- trigger settlement reminder push notifications
- log outcomes and partial failures

Idempotency rules:

- guard with `UNIQUE (household_id, year, month)`
- use `ON CONFLICT DO NOTHING` where appropriate
- log already-finalized households as no-op, not failure

### 2. Monthly Review Snapshot Job

This should run immediately after settlement finalization in the same cron execution window. It generates deterministic monthly review rows that become the analytic source of truth.

### 3. Monthly AI Recommendation Job

Schedule:

- after monthly review snapshot generation

Responsibilities:

- gather prior month review data
- gather plan data and top expenses
- generate recommendations
- validate response schema and evidence count
- version `ai_monthly_recommendations`

Fallback:

- finance overview page may trigger on-demand generation when the latest month is missing

### 4. Push Reminder Jobs

Recommended split:

- daily chore due reminder job
- shared-task waiting reminder job
- month-end expense reminder job
- settlement confirmation reminder job

Do not combine all reminder logic into one monolithic function. Shared operational code is fine; fan-out logic should remain separated by trigger type for easier retries and observability.

### 5. Operational Cleanup Jobs

Recommended later-phase jobs:

- expired invite cleanup
- stale upload cleanup for abandoned temporary assets
- cron log retention pruning

## AI Extraction Pipeline

The AI pipeline should be designed as a bounded, explainable extraction system rather than an autonomous bookkeeping agent.

### Stage 1. Input Acquisition

Inputs:

- freeform text
- camera photo
- receipt screenshot

Client responsibilities:

- resize/compress image before upload
- preserve a local preview
- include optional category hint when available

### Stage 2. Request Validation

Server validates:

- authenticated user exists
- payload size
- supported media type
- one request per capture submission
- timeout budget target of roughly 5 seconds

### Stage 3. Extraction

Server calls Gemini 2.5 Flash with:

- extraction prompt
- explicit schema target
- localized hints for Hong Kong payment/account/category terminology
- instructions to return confidence by field

Expected extracted fields:

- amount
- date
- category
- payment account type hint
- merchant source
- summary
- optional line items

### Stage 4. Normalization

Normalize output into internal types:

- `amount_cents`
- ISO date
- enum-compatible category
- matched local `payment_account_id` if one account fits
- unresolved account if no safe match exists
- confidence map

If normalization fails or latency exceeds budget:

- return `fallback`
- preserve source text or image for manual completion

### Stage 5. Human Confirmation

The confirmation form is mandatory. It should:

- highlight low-confidence fields
- block save when required fields are unresolved
- allow editing every AI field
- warn on late-adjustment scenarios for locked settlement months
- optionally attach the source image

### Stage 6. Persistence

Only after confirmation:

- upload receipt if provided
- call `record_expense()`
- insert optional `expense_line_items`

### Stage 7. Explainability and Analytics

Persist enough metadata to support:

- extraction success rate
- average confidence
- fallback rate
- correction frequency per field
- model latency and cost reporting

Recommended implementation detail:

- create an `ai_extraction_runs` table later if product analytics and prompt iteration become important; do not block v1 on it if cost/scope is tight

## Offline Strategy

Offline support should be selective. The wrong offline write strategy can corrupt trust in finance data.

### Offline Goals

- app opens while offline
- key summary screens remain readable from cache
- users can capture expenses offline without losing intent
- reconnect sync is explicit and resilient

### Screens Safe for Offline Cached Reads

- dashboard snapshot
- finance overview snapshot
- account list snapshot
- today’s chores snapshot
- onboarding state shell

These should use stale-while-revalidate or network-first with cache fallback.

### Writes That Can Be Queued Offline

Recommended:

- draft expense capture submission
- draft chore completion intent
- receipt/chore photo pending upload metadata

Possible with care:

- personal/shared expense save command, but only as a queued pending confirmation payload that is replayed online

Do not attempt offline execution of:

- settlement repayment
- account transfer
- balance adjustment
- savings contribution
- invite claim
- any write that depends on current authoritative balance or locked status

### Local Persistence Model

Use IndexedDB for:

- cached read models
- pending write queue
- recent AI text inputs
- pending media metadata and blob references

Recommended queue item shape:

- `id`
- `type`
- `household_id`
- `created_at`
- `payload`
- `idempotency_key`
- `retry_count`
- `last_error`
- `status`

### Sync Behavior

On reconnect:

1. verify auth session
2. flush uploads first if queued writes depend on object URLs
3. replay queue in deterministic order
4. treat server conflict or validation failures as user-visible exceptions
5. refresh household read models

### Conflict Strategy

- Finance writes should prefer server rejection over silent merge.
- Chore completion duplicates should be safely rejected by unique constraints and treated as already-completed success.
- If a queued expense becomes a late adjustment or duplicate by the time it syncs, show that outcome explicitly after replay.

### Service Worker Strategy

- precache shell and static assets
- route-level cache for selected pages
- background sync if supported, but do not depend on it
- visible offline banner and per-action “saved locally” / “needs connection” states

## Domain Boundaries and Read Models

To keep the codebase scalable, use domain-owned read models instead of page-owned SQL assembly.

Recommended server query modules:

- `getDashboardSnapshot(householdId, userId, todayHkt)`
- `getFinanceOverview(householdId, userId, month)`
- `getDailyAvailable(userId, householdId, todayHkt)`
- `getSettlementView(householdId, month)`
- `getTodayChores(householdId, userId, todayHkt)`
- `getSavingsGoalSummary(householdId, userId)`
- `getPartnerActivityFeed(householdId, partnerUserId)`

This keeps business logic reusable across:

- domain pages
- dashboard widgets
- offline cache population
- background refresh

## Realtime Strategy

Use Supabase Realtime selectively:

- partner activity feed updates
- settlement confirmation and dispute updates
- chore completion updates

Avoid realtime subscriptions for every finance list by default. High-value, low-volume live signals are enough for v1.

## Observability and Reliability

Recommended telemetry surfaces:

- API route latency and failure rates
- AI parse success/fallback/correction rate
- cron run status per household
- queue replay success/failure counts
- settlement finalization duration
- notification delivery attempts

Recommended operational logging records:

- `job_name`
- `run_at`
- `household_id` when applicable
- `status`
- `retry_count`
- `error_code`
- `error_message`

## Recommended Build Order

The build order should follow dependency and trust boundaries, not only page count.

### Phase 1. Trust Foundation

Deliver first:

- full Supabase schema migration from `docs/plans/DB-SCHEMA.sql`
- RLS enablement and verification
- core SECURITY DEFINER RPCs
- typed database regeneration
- auth session helpers and household resolution

Reason:

Every later surface depends on correct data isolation and money-safe mutation paths.

### Phase 2. Household Onboarding

Deliver:

- create household
- invite validation and claim
- two-member enforcement
- initial account setup

Reason:

No meaningful finance or chore workflow exists before household membership and account ownership are established.

### Phase 3. Finance Core Input Loop

Deliver:

- `/api/ai/parse-expense`
- AI text and image capture UI
- confirmation form
- `record_expense()`
- account list and event history
- personal budget daily available card

Reason:

This is the highest-value recurring workflow and establishes the primary ledger path.

### Phase 4. Planning and Settlement Core

Deliver:

- ratio planning
- savings goals and contributions
- settlement screen
- settlement confirmation
- settlement repayment RPC
- monthly settlement cron

Reason:

These features depend on the expense ledger already being trustworthy and populated.

### Phase 5. Reviews and AI Insights

Deliver:

- monthly review snapshots
- monthly review UI
- annual review UI
- `/api/ai/monthly-recommendations`
- recommendation versioning and display

Reason:

Insights are only useful after stable transactional and planning data exists.

### Phase 6. Chores Domain

Deliver:

- chore task CRUD
- recurrence logic
- shared-task dual confirmation
- optional photo check-in

Reason:

Chores can start in parallel after finance core if staffing allows, but they should not block the financial trust loop.

### Phase 7. Unified Dashboard

Deliver:

- dashboard read models
- widget composition
- partner activity feed
- selective realtime updates

Reason:

The dashboard should consume finished domain logic instead of inventing placeholder logic that later gets rewritten.

### Phase 8. Offline, Push, and Operational Hardening

Deliver:

- IndexedDB cache and queue
- service worker refinements
- push subscription management
- reminder jobs
- observability and audit tooling
- Lighthouse and security pass

Reason:

These are multipliers on top of working core flows, not substitutes for them.

## Explicit Recommendations

- Keep finance mutations in Postgres RPCs; do not move them into application code.
- Keep the dashboard as a read-composition surface only.
- Treat AI as structured extraction plus recommendation generation, never autonomous posting.
- Implement offline expense capture as queued confirmation payloads, not hidden ledger writes.
- Separate cron functions by business capability where possible for clearer retries and auditability.
- Preserve the couples-only assumption in application logic and copy for v1, even if some schema pieces appear extensible.

## Open Design Cautions

- The current planning documents mix “future extensibility” language with a schema explicitly enforcing exactly two members. The implementation should follow the enforced couples-only rule for v1.
- Chore writes are simpler than finance writes, but HKT recurrence logic can still create subtle bugs. Centralize recurrence calculation server-side.
- AI recommendation storage should retain prior versions rather than destructive overwrite.
- Storage growth can become a silent cost center; image size limits and retention rules should be decided early.

## Conclusion

The strongest architecture for Home PWA is a household-scoped, database-centered system with a thin client, a thin Next.js orchestration layer, RPC-backed financial commands, cron-driven monthly automation, explicit AI confirmation, and selective offline support. That structure matches the product’s trust requirements: shared money and shared chores can feel lightweight in the UI only if correctness, isolation, and recoverability are handled aggressively underneath.
