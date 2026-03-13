# Research Summary: Home PWA

Date: 2026-03-13

## Key Findings

**Stack:** The current repo direction is already the right one for v1: Next.js 16, React 19, TypeScript, Tailwind, Supabase, Vercel, installable PWA support, server-owned AI flows, and RPC-backed financial mutations.

**Table stakes:** Home PWA must clear the baseline in four areas to be credible:

- household setup and secure shared scope
- shared finance capture, attribution, settlement, and auditability
- chore recurrence, assignment, rotation, and reminders
- mobile-first reliability, including fast capture, installable PWA behavior, and cached list views

**Differentiators worth building in v1:** The product should differentiate through the combined household dashboard, true joint chores, AI-assisted but user-confirmed expense capture, explainable monthly coaching, and anti-scorekeeping tone.

**Anti-features:** Avoid direct bank sync, generic multi-member business logic, gamified chore scoring, shopping-list/calendar expansion, autonomous AI posting, and complex split rules in v1.

## Architecture Direction

- Use household membership as the primary tenant boundary.
- Put financial correctness in Postgres with RLS and RPC-style mutation boundaries.
- Treat AI outputs as drafts until explicitly confirmed by the user.
- Use background jobs for monthly settlement, review snapshots, AI coaching generation, and reminders.
- Support offline cached reads and carefully selected queued writes, not hidden reconciliation of sensitive finance actions.

## Biggest Risks

- Leaking household data across tables, storage, realtime, or notifications.
- Letting the product drift into partner scorekeeping rather than shared clarity.
- Mixing personal, shared, and household-total financial scopes.
- Shipping AI extraction that is fast but quietly wrong or too expensive.
- Mishandling month boundaries, settlement edge cases, or offline duplicate writes.
- Overpromising push notifications on iPhone PWAs.

## Roadmap Implications

The roadmap should start with security, auth, membership, timezone rules, and audit foundations. AI capture and attachment handling should come before the full finance surface so expense ingestion is trustworthy early. Finance should then be built as a coherent ledger/settlement/planning system, followed by chores and dashboard composition, then PWA/offline hardening, notifications, and AI coaching refinement.

## Recommended Phase Shape

1. Foundation and security boundaries
2. Household onboarding and shared membership flows
3. AI expense capture and attachment pipeline
4. Finance ledger, balances, settlement, planning, budgets, savings, and reviews
5. Chores, dashboard, and partner activity
6. PWA reliability, offline behavior, and media/storage hardening
7. Notifications and privacy-aware re-engagement
8. AI coaching and analytics tuning
