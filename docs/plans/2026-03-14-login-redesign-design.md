# Login Redesign Design

**Date:** 2026-03-14
**Scope:** `/login` only
**Direction:** `穩健理財型`

## Goal

Redesign the public auth entry page so it matches the project design language more closely: calm, trustworthy, mobile-first, and action-focused. The page must keep the existing Phase 1 auth flows intact while improving hierarchy, spacing, and component consistency.

## Constraints

- Keep existing auth behavior and server actions unchanged.
- Do not expand scope into full app-wide token or typography migration.
- Follow `docs/DESIGN-SYSTEM.md` for page tone, card usage, and color semantics where practical inside the current codebase.
- Prefer shadcn/radix primitives over custom structural markup for the auth card.

## Chosen Approach

Use a single primary auth card centered on a warm background. Keep supporting copy short and trust-oriented. Put all user action inside one strong card: mode switch, status messaging, form, password reset, and OAuth entrypoints.

This follows the design-system rule that only action-heavy sections should use a bordered card. The login page is entirely an action surface, so one strong card is appropriate.

## Visual Structure

1. Quiet page chrome
   - Warm background
   - Small eyebrow label
   - Compact trust-oriented intro copy

2. One auth card
   - Card header: title + short description
   - Mode switch: `Login` / `Register`
   - Status region: success/error message using alert styling
   - Form region: email/password and registration-only fields
   - Recovery link as secondary action
   - OAuth region separated visually but lower emphasis than primary auth form

3. Supporting note
   - Short privacy/trust-oriented microcopy under the card

## Component Plan

- `Card` for the main auth surface
- `Tabs` for login/register mode switch
- `Alert` for success/error feedback
- `Input` and `Button` for controls and actions
- Existing server actions remain the source of behavior

## Design Decisions

- No decorative hero illustration. This page should feel like a secure app entry, not a marketing landing page.
- No multi-section dashboard layout on login. That would dilute focus and weaken conversion.
- OAuth remains available, but visually secondary to email/password because the page should read as a dependable utility entrypoint.
- Register state should feel like part of the same trusted flow, not a separate page family.

## Success Criteria

- `/login` reads as a polished household-finance app entry rather than a temporary scaffold
- form hierarchy is clearer on mobile
- login/register switching feels deliberate and stable
- existing auth routes and callbacks continue to work without behavior regressions
