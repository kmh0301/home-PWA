---
phase: 1
slug: secure-foundation-and-household-boundary
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-13
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js lint + TypeScript compile + targeted Supabase/manual validation |
| **Config file** | `eslint.config.mjs`, `tsconfig.json` |
| **Quick run command** | `npm run lint` |
| **Full suite command** | `npm run lint && npx tsc --noEmit` |
| **Estimated runtime** | ~20-45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run lint && npx tsc --noEmit`
- **Before `$gsd-verify-work`:** Full suite must be green, plus household-isolation checks performed
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | AUTH-01 | static/manual | `npm run lint && npx tsc --noEmit` | ✅ | ⬜ pending |
| 1-01-02 | 01 | 1 | AUTH-02 | static/manual | `npm run lint && npx tsc --noEmit` | ✅ | ⬜ pending |
| 1-02-01 | 02 | 1 | HOUS-04 | static | `npm run lint && npx tsc --noEmit` | ✅ | ⬜ pending |
| 1-02-02 | 02 | 1 | HOUS-04 | integration/manual | `supabase policy verification or SQL check` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | HOUS-04 | static/manual | `npm run lint && npx tsc --noEmit` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/` or verification script for cross-household isolation — add if no existing automated DB verification exists
- [ ] Supabase/local SQL verification workflow documentation for Phase 1 validation

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| New user can sign up and enter the authenticated flow correctly | AUTH-01 | Requires end-to-end auth provider behavior, callback state, and redirect handling | Start from `/login`, complete sign-up, confirm callback/session handoff succeeds, and verify the user lands in the expected authenticated route state |
| Signed-out user is redirected away from protected app surfaces | AUTH-02 | Middleware/app routing behavior is easiest to confirm end-to-end in browser | Visit a protected route while signed out and confirm redirect to `/login` with `next` preserved where expected |
| Signed-in user without household membership is routed into onboarding instead of full app access | HOUS-04 | Requires session + seeded membership state | Sign in with a user lacking `household_members` row and confirm onboarding routing |
| Signed-in user with household membership can reach protected app shell in correct household context | AUTH-01, HOUS-04 | Depends on real auth/session + DB state | Sign in with a valid household member and confirm protected app entry works |
| Hong Kong boundary helper returns expected local month/day edges | HOUS-04 | Easier to inspect with representative timestamps | Run helper with UTC timestamps near HKT midnight/month edges and confirm output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
