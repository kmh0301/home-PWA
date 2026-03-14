## 1. Auth entry and route structure

- [x] 1.1 Replace the placeholder `/login` page with real login/register UI and form state
- [x] 1.2 Add server-side auth actions for sign-in, sign-up, password reset, and OAuth start
- [x] 1.3 Add dedicated onboarding routes for create, join, and account setup flows

## 2. Onboarding routing and membership state

- [x] 2.1 Add shared server utilities to resolve current user profile, household membership, and onboarding completion state
- [x] 2.2 Update the root entrypoint and protected-route handoff to route users to login, onboarding, or dashboard correctly
- [x] 2.3 Normalize onboarding redirect rules so authenticated users cannot revisit the wrong step accidentally

## 3. Household onboarding flows

- [x] 3.1 Implement the create-household form and server mutation for household + membership + invite creation
- [x] 3.2 Implement the join-household flow with invite validation, invite claim, and user-facing failure states
- [x] 3.3 Add UI feedback for invite success, invite sharing/copy, and v1 two-member limit failures

## 4. Initial account setup and verification

- [x] 4.1 Implement the initial payment-account setup form with presets, custom account rows, and skip behavior
- [x] 4.2 Wire account setup submissions to the documented account creation and adjustment boundaries
- [ ] 4.3 Add onboarding verification coverage for the core route decisions and key mutation/error paths
