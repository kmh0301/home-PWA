# Home PWA

## What This Is

Home PWA is a mobile-first household collaboration app for co-living couples that helps them manage shared finances and housework in one place. It combines fast AI-assisted expense capture, transparent monthly settlement, savings planning, and daily chore coordination so both people can clearly see how the home is running and reduce friction.

The v1 product is optimized for a two-person household group model, with data structures that can later extend to roommates or small families without hard-coding fixed member roles.

## Core Value

Two people can run a home together with shared clarity, not guesswork, across money and chores.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Users can create a household group, invite their partner, and work from a shared group data scope.
- [ ] Users can record personal and shared expenses quickly through AI-assisted text or image input, confirm extracted fields, and save accurate transactions.
- [ ] Users can track payment account balances, shared settlement status, savings goals, budgets, and monthly financial review data in one system.
- [ ] Users can manage daily chores across personal, rotating, and joint tasks, including the joint-task completion model that reflects the product’s “do it together” positioning.
- [ ] Users can open the app and immediately understand today’s household status from dashboard summaries, alerts, and partner activity.

### Out of Scope

- Native iOS or Android apps — the project is intentionally PWA-first to reduce delivery cost and support faster iteration.
- Bank API sync and guaranteed real-time balance parity — v1 uses user-maintained account events and only provides reference balances.
- Multi-member household workflows beyond two-person business logic — the data model allows future extension, but v1 rules, copy, and settlement logic are explicitly designed for couples.
- Shopping list and calendar/scheduling modules — acknowledged future directions, but not part of the current core value.
- Email-forward expense parsing — technical feasibility is not yet validated and the PRD explicitly pushes this out of the v1 MVP.

## Context

The source PRD defines a Hong Kong household collaboration product centered on a shared household group model, Hong Kong timezone rules, and support for common local payment methods like Alipay HK and PayMe. The financial scope for v1 is broad and deliberate: AI bookkeeping, shared finance settlement, balance tracking, ratio planning, personal budgets, savings goals, monthly and yearly reviews, and AI coaching are all in scope.

The product positioning rejects “scorekeeping” between partners. Joint chores must visibly support collaboration, especially through a shared-task type that only completes after both members confirm. Financial views also distinguish personal, shared, and household-total calculation scopes to avoid inconsistent planning, review, and AI advice.

Success is defined by fast bookkeeping confirmation, timely shared-settlement completion, sustained savings-rate behavior, visible chore completion, AI suggestion adoption, and eight-week retention for two-person households. Non-functional expectations include row-level data isolation, offline-capable cached list views, auditable balance events, and explainable AI outputs.

## Constraints

- **Platform**: PWA, mobile-first — optimize for installable cross-platform use without App Store distribution.
- **Primary audience**: Two-person co-living couples — v1 UX and business rules are tuned for this scenario first.
- **Timezone**: `Asia/Hong_Kong` — settlement windows, recurring chore rotation, and monthly automation depend on this.
- **Data model**: Member-list based, not fixed A/B fields — future extensibility depends on dynamic member references.
- **AI safety**: AI-extracted bookkeeping data must always be user-confirmed before persistence — extracted output cannot directly post transactions.
- **Security**: Group-scoped data isolation with RLS — users must never access data outside their household group.
- **Performance**: AI extraction should typically return within 5 seconds — bookkeeping speed is a core product promise.
- **Budget/cost**: AI extraction and monthly coaching need viable model economics — PRD flags ongoing API cost validation as a pending decision.
- **Storage**: Photos and attachments likely rely on constrained object storage — v1 needs a bounded approach for chore proof and receipt images.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Build as a PWA first | Faster iteration, lower cost, and installable mobile experience without store review overhead | — Pending |
| Optimize v1 for couples, not generic groups | The core product promise and settlement/chore logic are specifically about two people running a home together | — Pending |
| Keep finances and chores in one product | The household state is split across both domains; the dashboard value depends on showing them together | — Pending |
| Require explicit confirmation before saving AI bookkeeping output | Trust and data correctness matter more than zero-click automation for financial records | — Pending |
| Include joint chores in v1 | The product positioning breaks if chores are only delegated rather than jointly completed | — Pending |

---
*Last updated: 2026-03-13 after initialization*
