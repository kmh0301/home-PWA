# Login Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the `/login` page into a design-system-aligned auth entry while preserving existing Phase 1 auth behavior.

**Architecture:** Install a minimal set of shadcn/radix UI primitives into the project, then refactor the login page to compose those primitives around the existing server actions. Keep behavior stable by limiting changes to page structure, styling, and route-level presentation.

**Tech Stack:** Next.js App Router, React 19, Tailwind v4, shadcn/radix UI, Supabase auth server actions

---

### Task 1: Add minimal UI primitives

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/tabs.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/alert.tsx`

**Steps:**
1. Add the minimal shadcn primitives needed for the auth entry page.
2. Verify imports resolve through `@/components/ui/*`.
3. Keep generated component styling semantic and close to defaults.

### Task 2: Redesign `/login`

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

**Steps:**
1. Replace the current custom auth layout with a single-card structure.
2. Use tabs for login/register presentation while preserving query-param-controlled mode.
3. Move success/error messaging into alert components.
4. Rebuild form and OAuth sections with clearer hierarchy and spacing.

### Task 3: Verify no behavior regressions

**Files:**
- Reuse: `src/app/(auth)/login/actions.ts`
- Reuse: `src/app/auth/callback/route.ts`

**Steps:**
1. Run `npm run lint`
2. Run `npx tsc --noEmit`
3. Validate `/login` still renders expected login/register content
4. Validate auth actions remain wired into the page
