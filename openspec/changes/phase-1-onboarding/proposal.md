## Why

Phase 0 established the application shell and infrastructure, but users still cannot enter the product, create or join a household, or complete the minimum setup needed to reach the protected app. Phase 1 is needed to turn the current foundation into a usable onboarding flow for the v1 two-person household scope.

## What Changes

- Replace the current placeholder login route with a real login/register experience using Supabase email/password and OAuth entrypoints.
- Add the splash-screen routing logic that decides whether a visitor should log in, create/join a household, or enter the protected app.
- Add the household onboarding flow for creating a household, joining via invite code, and handling invite validation/failure states.
- Add the initial payment-account setup flow with default account presets, optional custom accounts, and safe account initialization via the documented RPC boundaries.
- Add onboarding-level verification for the two-person household boundary and core RLS expectations.

## Capabilities

### New Capabilities
- `onboarding-auth-entry`: Handles splash routing, login/register UI, password reset, and OAuth initiation for onboarding.
- `onboarding-session-routing`: Handles session-aware entry decisions between splash, public auth, household setup, and the protected app.
- `household-onboarding-flow`: Handles creating a household, generating/sharing invite codes, validating invite codes, and joining a household with v1 two-member constraints.
- `onboarding-account-setup`: Handles the initial payment-account setup step, including default presets, optional custom accounts, and skip behavior before the user enters the app.

### Modified Capabilities

None.

## Impact

- Affects public auth routes, protected app entry routing, middleware/session checks, and onboarding page structure.
- Introduces Supabase auth actions, onboarding form state, and RPC integrations for household and payment account setup.
- Depends on the existing Phase 0 foundation and the planned database schema/RPC contracts documented in `docs/plans/DB-SCHEMA.sql`.
