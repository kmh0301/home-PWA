# Home PWA Pitfalls Research

## Scope

This document identifies product and implementation pitfalls for Home PWA: a couples household collaboration PWA that combines shared finances, chores, AI-assisted extraction, push notifications, offline behavior, and shared permissions.

There is no standalone roadmap file in `.planning` yet, so the phase mapping below uses a recommended roadmap derived from `PROJECT.md`.

## Recommended Roadmap Phases

| Phase | Focus |
|------|-------|
| Phase 1 | Foundations: auth, household data model, RLS, audit model, timezone rules |
| Phase 2 | Household onboarding, invites, membership lifecycle, shared permissions |
| Phase 3 | AI capture and attachments: receipt/image upload, extraction confirmation, cost/latency controls |
| Phase 4 | Finance ledger, balances, savings, budgets, settlement rules, reviews |
| Phase 5 | Chores, joint completion flows, dashboard state, partner activity |
| Phase 6 | PWA reliability: offline cache, sync, conflict handling, storage constraints |
| Phase 7 | Notifications, reminders, privacy boundaries, re-engagement tuning |
| Phase 8 | AI insights/coaching hardening, analytics, abuse monitoring, retention tuning |

## Pitfalls

### 1. Household data isolation breaks at the edges

Financial data, receipt images, chore proofs, activity feed items, and notification targets all live under the same household concept. A system that protects the main tables but leaks attachments, realtime channels, or derived views still fails the core trust requirement.

- Warning signs:
  - Queries rely on client-supplied `household_id` without server-side verification.
  - Storage paths, signed URLs, or realtime subscriptions are not scoped by verified membership.
  - Background jobs or push fan-out select records without re-checking current membership.
  - Internal admin/debug tools bypass the same access rules as production APIs.
- Prevention strategy:
  - Enforce household membership through RLS and server-side authorization on every table, storage object, RPC, and notification job.
  - Model membership explicitly with lifecycle states such as invited, active, suspended, left, and removed.
  - Treat derived data, caches, exports, and notification payload generation as security-sensitive surfaces.
  - Add fixture-based permission tests for cross-household reads, writes, attachment access, and subscription delivery.
- Roadmap phase:
  - Phase 1, then Phase 2 validation for invite and membership edge cases.

### 2. The product drifts into “scorekeeping your partner”

The brief explicitly rejects adversarial scorekeeping. If financial balances, chore counts, streaks, and activity feeds are framed competitively, the app can intensify household tension instead of reducing it.

- Warning signs:
  - UI language centers on “who owes more” or “who does more” rather than shared household state.
  - Ranking, streak, or badge mechanics reward comparison between partners.
  - Dashboard surfaces raw imbalance without context or resolution guidance.
  - Joint chores are represented as assigned-to-one-person work rather than collaborative completion.
- Prevention strategy:
  - Design around shared clarity, negotiated plans, and next actions instead of competition.
  - Keep personal, shared, and household-total scopes explicit so users know what a number means.
  - Use neutral copy for settlement and chores, with collaborative CTAs such as review, confirm, discuss, and resolve.
  - Test the UX with conflict-sensitive scenarios, not only happy-path productivity flows.
- Roadmap phase:
  - Phase 4 and Phase 5, with product guardrails defined earlier in Phase 1.

### 3. Personal, shared, and household-total money scopes get mixed together

This product intentionally supports multiple financial scopes. If a transaction, balance, budget, savings goal, or AI suggestion uses the wrong scope, users will see contradictory numbers and lose trust quickly.

- Warning signs:
  - The same transaction appears in both personal and shared totals without an explicit split model.
  - Balance screens are derived from edited summary values rather than immutable events.
  - AI advice references “monthly spending” without stating whether it is personal, shared, or household-total.
  - Budgets and reviews disagree because they aggregate from different filters.
- Prevention strategy:
  - Make calculation scope a first-class field in the domain model, not an inferred UI concern.
  - Centralize aggregation logic and reuse it across dashboard, review, settlement, and AI prompts.
  - Preserve immutable ledger/event history and derive balances from events plus auditable adjustments.
  - Add snapshot tests for representative month-end scenarios with personal-only, shared-only, and mixed data.
- Roadmap phase:
  - Phase 4.

### 4. AI extraction feels fast but is quietly wrong

The core promise is quick bookkeeping with user confirmation. OCR/LLM extraction errors on multilingual receipts, Hong Kong payment methods, taxes, merchant aliases, split expenses, and dates will create more correction work than manual entry if the workflow is sloppy.

- Warning signs:
  - Low-confidence fields are auto-filled without confidence disclosure.
  - Users frequently edit merchant, amount, payer, category, or date before saving.
  - Image quality, currency, or language variants are not captured in telemetry.
  - The system treats extraction output as authoritative instead of a draft.
- Prevention strategy:
  - Require explicit confirmation before persistence for all extracted records.
  - Capture field-level confidence and drive the confirmation UI from uncertainty, not from a flat form.
  - Train prompts and validation around Hong Kong-specific receipt/payment patterns such as PayMe, AlipayHK, mixed English/Chinese text, and service-charge/tax layouts.
  - Store the original artifact and extraction trace so users can audit and support can debug.
- Roadmap phase:
  - Phase 3.

### 5. AI cost and latency erode the core loop

The brief sets a typical extraction target of 5 seconds and flags cost viability as open. A workflow that depends on expensive or slow models will be abandoned quickly on mobile.

- Warning signs:
  - Median extraction time rises above the user’s patience threshold.
  - Retries, duplicate uploads, and “submit again” behavior increase.
  - Per-household AI cost grows with common actions, not just premium usage.
  - Monthly coaching uses large prompts with low downstream adoption.
- Prevention strategy:
  - Define latency and unit-cost budgets per AI flow before full rollout.
  - Split work into cheap deterministic preprocessing plus targeted model usage.
  - Gate high-cost coaching/summarization behind explicit user intent or batch schedules.
  - Instrument correction rate, abandonment rate, and adoption rate alongside model cost.
- Roadmap phase:
  - Phase 3 initially, with Phase 8 tuning for coaching and insights.

### 6. Settlement logic fails at month boundaries and backdated edits

Settlement is not just a running total. It depends on timezone, month-close behavior, edits after close, reversals, shared-vs-personal rules, and the reference nature of manually maintained balances.

- Warning signs:
  - Users can backdate transactions into a closed month without a visible restatement effect.
  - Monthly review totals differ when viewed on two devices around midnight in different time contexts.
  - The app recalculates historical settlement silently after edits.
  - Shared expenses and reimbursements are handled with inconsistent split assumptions.
- Prevention strategy:
  - Anchor all financial period calculations to `Asia/Hong_Kong` server-side.
  - Define explicit month-close and restatement rules before implementation.
  - Version settlement snapshots and show when a past period has been reopened or adjusted.
  - Test edge cases for late edits, deleted transactions, refunds, partial reimbursement, and invite/join changes mid-month.
- Roadmap phase:
  - Phase 1 for temporal rules, Phase 4 for implementation.

### 7. Joint chore completion becomes either fake or annoying

The product differentiation depends on joint chores that only complete when both members confirm. If the flow is too loose, one person can complete it for both. If too strict, people stop using it for everyday life.

- Warning signs:
  - Users avoid joint chores and convert them into personal chores.
  - Both confirmations can be submitted from one device without clear attribution.
  - Race conditions create duplicate confirmations or stuck “almost complete” states.
  - Reminder logic nags both partners after one of them already confirmed.
- Prevention strategy:
  - Model joint chore completion as two independent confirmations attached to member identity and timestamp.
  - Support graceful partial states such as one confirmed / waiting for partner.
  - Keep the confirmation action lightweight, but resistant to accidental or impersonated completion.
  - Tune reminder rules to household state, not just due dates.
- Roadmap phase:
  - Phase 5.

### 8. Activity feeds and reminders cross the line into partner surveillance

Shared household visibility is valuable; feeling monitored is not. Overly detailed activity logs and push notifications can trigger relational distrust, especially when finance and chores are combined in one stream.

- Warning signs:
  - Push notifications include sensitive amounts or judgmental phrasing on the lock screen.
  - The app announces every edit, skip, or late completion to the partner.
  - Users disable notifications quickly after install.
  - Product discussions frame visibility as accountability rather than coordination.
- Prevention strategy:
  - Separate operational reminders from sensitive financial detail.
  - Provide notification granularity controls for categories and lock-screen privacy.
  - Default to summary-level partner activity rather than exhaustive event broadcasting.
  - Treat relationship sensitivity as a product requirement during copywriting and UX reviews.
- Roadmap phase:
  - Phase 5 for feed design, Phase 7 for notification policy and tuning.

### 9. Offline support creates duplicate or conflicting household state

Offline capability is an explicit non-functional expectation. In a shared household app, offline is not just local caching; it creates concurrent edits from two members across balances, chores, receipts, and reminders.

- Warning signs:
  - The app treats offline-created records as globally committed without sync acknowledgement.
  - Retried uploads create duplicate expenses or duplicate chore confirmations.
  - Conflict resolution is implicit and invisible to the user.
  - Local state stores derived totals instead of replayable domain events.
- Prevention strategy:
  - Design every mutating action with idempotency keys and deterministic sync semantics.
  - Prefer append-only events or server-issued version checks for contentious records.
  - Distinguish “saved locally” from “synced to household” in the UI.
  - Build explicit conflict policies for edits to balances, recurring chores, and AI-draft transactions.
- Roadmap phase:
  - Phase 6, with domain requirements established in Phases 3 to 5.

### 10. PWA push assumptions fail on iPhone and degrade silently

Web push on iOS/iPadOS depends on Home Screen installation, permission must follow a direct user interaction, and behavior differs from native-app expectations. A roadmap that assumes universal push support will overpromise core reminders.

- Warning signs:
  - Reminder success metrics are measured as if all mobile browsers support the same push flow.
  - The app prompts for notification permission before install or outside a user gesture.
  - Product copy promises “instant reminders” before eligibility is verified.
  - There is no fallback for users who never install to the Home Screen.
- Prevention strategy:
  - Design notifications as an opt-in capability with device-state detection and fallback messaging.
  - Gate permission prompts behind user intent and only after install-eligibility is understood.
  - Track install state, permission state, and delivery state separately.
  - Keep non-push reminder channels inside the app for critical household workflows.
- Roadmap phase:
  - Phase 6 for platform capability handling, Phase 7 for production rollout.

### 11. Attachment storage and sync become the hidden scalability bottleneck

Receipts and chore proof photos are operationally useful but expensive in storage, upload time, and cache pressure. Poor media boundaries can damage both AI costs and offline reliability.

- Warning signs:
  - Users upload full-resolution camera images without compression or lifecycle rules.
  - Cached media pushes the app over practical device storage limits.
  - Extraction and sync queues compete for the same large files.
  - Old attachments remain indefinitely even when the derived transaction is retained.
- Prevention strategy:
  - Define strict limits for image dimensions, formats, retention classes, and offline caching behavior.
  - Generate optimized variants for preview, extraction, and audit instead of reusing the original everywhere.
  - Separate immutable evidence storage from ephemeral client cache.
  - Add quotas and housekeeping jobs before opening heavy attachment features broadly.
- Roadmap phase:
  - Phase 3 for ingestion, Phase 6 for cache/storage policy.

### 12. Invite, leave, rejoin, and device-switch flows break shared ownership

Household apps often work for the happy path and fail when a member changes devices, accepts an invite late, leaves a household, rejoins, or needs access restored. These are high-risk because finance and chores are both shared domains with audit implications.

- Warning signs:
  - Records depend on mutable user profile names instead of stable member IDs.
  - Pending invites are not distinguished from active members in authorization checks.
  - Ownership of chores, confirmations, and transactions becomes ambiguous after leave/rejoin.
  - Push tokens, device registrations, or cached household data survive membership removal.
- Prevention strategy:
  - Separate account identity, household membership identity, and device registration identity.
  - Keep immutable actor references on financial and chore events even if membership status changes later.
  - Model invite expiration, reactivation, and removal explicitly.
  - Revoke sessions, subscriptions, and push targets as part of membership state transitions.
- Roadmap phase:
  - Phase 2, with Phase 7 checks for notification revocation.

### 13. Derived balances and dashboards hide a lack of auditability

The brief calls for auditable balance events. If the implementation optimizes too early for “simple current balance” screens, the system will be unable to explain why a number changed after manual corrections, backfills, or AI-assisted edits.

- Warning signs:
  - Balances are stored as a single mutable column with no event history.
  - Dashboard cards cannot be traced back to source records.
  - Manual “fix balance” actions do not create explicit adjustment records.
  - Support/debugging requires database forensics instead of reading a timeline.
- Prevention strategy:
  - Use event-sourced or at least append-only balance history with typed adjustment reasons.
  - Make every top-line number drillable into a source timeline.
  - Record AI-originated drafts, user edits, and final persisted values as distinct states when relevant.
  - Treat explainability as a requirement for both product trust and internal operations.
- Roadmap phase:
  - Phase 1 for data model, Phase 4 for financial surfaces.

### 14. AI advice and monthly coaching become unexplainable or overly intrusive

The project includes AI coaching and explainable AI outputs. Advice about spending, savings, or chores can be harmful if it is vague, judgmental, based on the wrong scope, or pushed at the wrong time.

- Warning signs:
  - Suggestions cannot cite which data window or scope they used.
  - Coaching repeats generic language with little measurable behavior change.
  - Users receive sensitive advice through push or shared surfaces without consent context.
  - Product and engineering teams cannot replay the prompt/context that produced an insight.
- Prevention strategy:
  - Require every insight to declare its input window, scope, and confidence/limitations.
  - Prefer explainable rule-plus-LLM patterns over opaque freeform advice for high-sensitivity domains.
  - Keep AI coaching user-invoked or clearly scheduled, not ambiently intrusive.
  - Measure adoption and correction, not just generation volume.
- Roadmap phase:
  - Phase 8.

## Cross-Phase Recommendations

- Define canonical household domain primitives early: `household`, `membership`, `member`, `financial_event`, `balance_adjustment`, `chore`, `joint_confirmation`, `notification_target`, and `attachment`.
- Create one timezone policy document for `Asia/Hong_Kong` month-close, recurrence, reminders, and review windows before feature teams diverge.
- Instrument trust metrics from day one: extraction correction rate, settlement restatement rate, duplicate-offline-write rate, notification disable rate, and cross-household authorization test coverage.
- Treat partner trust and privacy as first-order design constraints, not just copywriting polish.

## Platform Notes Used In This Research

- MDN Web Docs on the Notifications API permission flow and secure-context requirements: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
- web.dev guidance on storage for the web and quota/eviction behavior: https://web.dev/articles/storage-for-the-web
- WebKit guidance on Web Push for Web Apps on iOS/iPadOS Home Screen installs: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
