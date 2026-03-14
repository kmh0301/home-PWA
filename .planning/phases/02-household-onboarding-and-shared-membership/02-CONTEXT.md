# Phase 2: Household Onboarding And Shared Membership - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Let one signed-in partner create the household, generate and share an invite code, let the second signed-in partner validate and claim that invite, and then activate a shared two-person household workspace without breaking membership identity for later finance, chore, and notification records.

</domain>

<decisions>
## Implementation Decisions

### Household creation flow
- The creation flow should use a warm, supportive tone rather than a cold setup wizard tone.
- Creating a household should ask only for the household name in this phase.
- After successful creation, the primary focus should immediately shift to inviting the partner.
- The success state should prominently show the invite code and its expiry time.

### Invite code handoff
- Invite handoff should be centered on a 6-character invite code.
- Invite copy should stay direct and clear, closer to "請對方輸入以下邀請碼" than overly emotional language.
- The UI should clearly display the invite expiry time instead of hiding or softening it.
- The invite card should keep two primary actions: copy the code and open the native/system share sheet.

### Join confirmation flow
- After validating an invite code, the join preview should show the household name, the creator's display name, and the current member count.
- The joining user's display name should be editable, but prefilled from the account profile when available.
- Joining should require only a single confirmation action after the preview screen.
- Invalid or expired invite messaging should be direct and explicit, with guidance to request a fresh invite.

### Post-join landing
- After a successful join, the second member should see a dedicated success page before being sent to payment account setup.
- The success page should emphasize "你已成功加入家庭" rather than only task-oriented copy.
- The success page should keep the details lightweight: household name plus a clear next-step button.
- The primary CTA on the success page should explicitly continue the onboarding flow with payment account setup.

### Claude's Discretion
- Exact microcopy wording, as long as it stays in Traditional Chinese suitable for Hong Kong users.
- Exact visual treatment of progress indicators, success styling, and empty spacing.
- Whether the create/join pages use a simple card flow or a slightly more step-based presentation, as long as the above decisions remain visible.

</decisions>

<specifics>
## Specific Ideas

- The product tone should feel suitable for Hong Kong couples managing a shared home, not a generic SaaS admin workspace.
- Invite sharing should work well for common handoff patterns such as WhatsApp message sharing or verbally passing a short code.
- The join flow should reduce the chance of entering the wrong household by making the household identity visible before confirmation.
- The post-join experience should feel like a completed milestone, not an abrupt redirect.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/app/onboarding/create/page.tsx`: already has a create-household page with a success card, invite code display, and a link toward account setup.
- `src/app/onboarding/join/page.tsx`: already has validate-then-claim invite steps that can be refined instead of replaced from scratch.
- `src/app/onboarding/actions.ts`: already implements `createHouseholdAction`, `validateInviteAction`, and `claimInviteAction`, including invite generation and RPC-based validation/claim logic.
- `src/components/share-invite-code-button.tsx`: already provides copy and native share actions, matching the preferred invite handoff actions.
- `src/lib/onboarding/state.ts`: already defines the onboarding route progression based on auth, membership, and account setup state.

### Established Patterns
- Onboarding routes are server-rendered pages backed by server actions and redirect-based flow control.
- Household membership is inferred from `household_members` and used as the gate for later app areas.
- Auth and onboarding currently assume a compact mobile-first single-card layout, which should remain the baseline for this phase.
- Phase 1 already established Traditional Chinese copy on `/login`; onboarding copy should align with that localization direction.

### Integration Points
- `src/app/onboarding/layout.tsx` is the routing gate that currently redirects signed-in users to create, accounts, or dashboard based on onboarding state.
- `src/lib/household/current-household.ts` is the source of truth for current membership lookup and redirects when no household is attached.
- `claimInviteAction` currently redirects straight to `/onboarding/accounts?joined=1`; Phase 2 planning should account for the new dedicated success state before account setup.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-household-onboarding-and-shared-membership*
*Context gathered: 2026-03-14*
