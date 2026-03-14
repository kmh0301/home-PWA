## Context

Phase 0 delivered the infrastructural baseline: protected route shell, Supabase helper pattern, auth callback route, and PWA scaffolding. The product is still not usable because the public auth route is only a placeholder, the root entrypoint does not make household-aware routing decisions, and there are no forms or actions for creating/joining a household or completing the initial payment-account setup.

Phase 1 has to convert that baseline into a real onboarding pipeline for the documented v1 scope: exactly two-member households. This means authentication, household setup, and first-run account setup must be implemented as one connected flow rather than as isolated pages. The design also has to respect the documented DB/RPC boundaries from `docs/plans/DB-SCHEMA.sql`, especially invite validation, invite claiming, and account initialization rules.

## Goals / Non-Goals

**Goals:**
- Implement a real public onboarding entry experience with login/register, OAuth initiation, password reset trigger, and user-facing error states.
- Implement session-aware routing that sends the user to `/login`, `/onboarding/create`, `/onboarding/join`, `/onboarding/accounts`, or `/dashboard` based on session and household state.
- Implement household creation and invite-code join flows aligned with the v1 two-person constraint and documented RPC contracts.
- Implement the initial payment-account setup step with default presets, optional custom accounts, skip behavior, and safe RPC-backed initialization for balances.
- Keep onboarding implementation aligned with the existing protected shell and Supabase SSR pattern rather than rebuilding auth flow from scratch on the client.

**Non-Goals:**
- Implement finance overview, account management detail screens, AI expense parsing, or any Phase 2+ feature.
- Expand support beyond the documented two-member household scope.
- Introduce advanced state management libraries if React state and server actions are sufficient.
- Rework the Phase 0 shell or PWA baseline unless onboarding reveals a real defect.

## Decisions

### 1. Use dedicated onboarding route segment under `/onboarding/*`

Household creation, invite join, and account setup will live under `/onboarding/create`, `/onboarding/join`, and `/onboarding/accounts` instead of overloading `/login` or `/dashboard`. This keeps public auth separate from authenticated-but-not-ready setup flow and matches the routing decisions already described in the project plan.

Alternatives considered:
- Keep everything under `/login`: rejected because the page would mix public auth and authenticated setup states into one incoherent flow.
- Put onboarding pages inside the protected `(app)` shell: rejected because initial setup should not inherit the bottom-nav shell before the user is actually ready to use the app.

### 2. Keep auth/session decisions server-first and use middleware only for coarse route gating

Middleware will continue handling session presence at a coarse level, while route-level server logic will determine whether the authenticated user has a household and whether account setup is complete. This avoids forcing household bootstrap state into middleware and keeps the routing logic testable in regular server code.

Alternatives considered:
- Push all onboarding routing into middleware: rejected because it would couple business-state queries to edge logic and make redirects harder to reason about.
- Handle everything client-side after mount: rejected because it introduces flicker and weakens entry correctness.

### 3. Use server actions / route handlers for onboarding mutations and keep Supabase RPC boundaries explicit

The household create/join and account setup flows will call the documented RPCs or direct inserts from server-side code paths, not from ad hoc client-side Supabase mutations. The UI submits forms, but the authoritative logic stays server-side so errors can be normalized and ownership checks stay close to the data boundary.

Alternatives considered:
- Direct client-side Supabase writes from forms: rejected because it spreads auth-sensitive mutation logic across the UI and makes error normalization inconsistent.
- A custom backend layer separate from Next.js: rejected because Phase 1 does not need another service boundary.

### 4. Model onboarding account setup as idempotent, preset-first form composition

The initial account setup page will render a small set of default account presets plus optional custom accounts. It will only create enabled accounts and will use the documented adjustment RPCs to initialize non-zero balances or credit-card used amounts. This keeps onboarding aligned with the later finance model instead of inventing a one-off initialization path.

Alternatives considered:
- Simple raw inserts only: rejected because opening balances would then bypass the event ledger model documented for accounts.
- Force all users to configure every possible account: rejected because the project plan explicitly allows skip and optional setup.

### 5. Normalize onboarding state into thin shared utilities rather than a global onboarding store

Phase 1 will likely need a few shared utilities for current user profile, household membership status, and onboarding redirects, but not a full global client store. A thin server-first utility layer is enough and keeps the React tree small.

Alternatives considered:
- Introduce Zustand/Redux immediately: rejected because it adds complexity before real client-side coordination exists.

## Risks / Trade-offs

- [The documented SQL/RPC contracts may not yet exist in a runnable local Supabase project] -> Build the UI/server integration around the documented boundaries and leave clearly marked implementation seams where Phase 0 only created placeholders.
- [Onboarding routing can become inconsistent if household/account checks are duplicated] -> Centralize the decision logic in shared server helpers and route entrypoints.
- [OAuth callback and post-auth routing can fight each other] -> Keep callback responsibility narrow: establish session first, then defer next-step routing to the root/splash decision path.
- [Account setup can accidentally bypass event-ledger invariants] -> Use the documented adjustment RPCs for non-zero starting states instead of updating balances inline.

## Migration Plan

1. Replace the placeholder `/login` experience with real auth forms and OAuth entrypoints.
2. Add onboarding routes for household create, household join, and initial account setup.
3. Add shared server-side onboarding state utilities to determine the next route for the current user.
4. Wire create/join/account setup mutations to server-side Supabase interactions aligned with the planned schema/RPC contracts.
5. Update the root entry behavior and protected-route handoff so authenticated users land in the correct onboarding or app destination.
6. Verify onboarding flows and update task status in the change artifact.

Rollback is low risk because onboarding routes are additive. If a specific onboarding step is unstable, it can be disabled behind redirect logic while keeping the Phase 0 foundation intact.

## Open Questions

- Whether the local Supabase instance already has the household/invite/account RPCs from the planning schema available for direct integration, or whether Phase 1 will need temporary server wrappers first.
- Whether the app should collect `display_name` only during register/join flows or also expose it in a later profile screen before launch.
