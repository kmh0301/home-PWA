# Phase 0 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the runnable Phase 0 baseline for Home Collaboration PWA: Next.js App Router scaffold, Supabase/auth foundation, PWA baseline, and deployment/setup documentation.

**Architecture:** Start with a server-first Next.js App Router shell and route groups, then layer in typed Supabase helpers, middleware auth, and a minimal PWA/deployment baseline. Keep business flows out of scope so the foundation stays small, testable, and aligned with `openspec/changes/phase-0-foundation`.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase SSR helpers, PWA plugin for Next.js, Vercel

---

### Task 1: Scaffold the application baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `components.json`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/(app)/page.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/components/app-shell.tsx`
- Create: `src/components/providers.tsx`
- Create: `src/lib/utils.ts`
- Create: `src/styles/globals.css`
- Test: `npm run lint`

**Step 1: Write the failing test**

Create a minimal smoke check by wiring `npm run lint` before the app files exist and note the expected failure due to missing project config.

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: command fails because the project scaffold and lint configuration do not exist yet.

**Step 3: Write minimal implementation**

Create the Next.js application scaffold, Tailwind/global styles, path aliases, shadcn base config, root layout, route groups, and a minimal shell/provider split that does not force client-only state globally.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: lint completes without configuration or missing-entry errors.

**Step 5: Commit**

```bash
git add package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs components.json src/app src/components src/lib src/styles
git commit -m "feat: scaffold phase 0 app foundation"
```

### Task 2: Add Supabase helper and auth infrastructure

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/app/auth/callback/route.ts`
- Create: `middleware.ts`
- Create: `src/types/database.types.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/providers.tsx`
- Test: `npm run lint`

**Step 1: Write the failing test**

Add the auth infrastructure files as imports/usages from the layout and middleware entrypoints before implementing the helper modules.

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: lint fails with unresolved imports or missing helper definitions for Supabase/auth infrastructure.

**Step 3: Write minimal implementation**

Add environment parsing, typed Supabase helpers for server/browser/middleware use, the auth callback route, middleware route protection, and a placeholder generated database type file that documents regeneration expectations.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: lint passes and the auth infrastructure imports resolve cleanly.

**Step 5: Commit**

```bash
git add src/lib/env.ts src/lib/supabase src/app/auth/callback/route.ts middleware.ts src/types/database.types.ts src/app/layout.tsx src/components/providers.tsx
git commit -m "feat: add supabase auth foundation"
```

### Task 3: Add schema workflow and developer setup documentation

**Files:**
- Create: `supabase/migrations/20260313000000_phase_0_foundation.sql`
- Create: `.env.example`
- Create: `README.md`
- Modify: `package.json`
- Test: `npm run lint`

**Step 1: Write the failing test**

Reference the missing schema workflow and environment documentation from `README.md` and `package.json`.

**Step 2: Run test to verify it fails**

Run: `npm run lint`
Expected: lint or config validation fails because referenced files/scripts do not exist yet.

**Step 3: Write minimal implementation**

Add a migration entrypoint that points maintainers back to the planned SQL schema source, add `.env.example`, and document local setup, Supabase schema/type generation commands, and expected repository workflow in `README.md`.

**Step 4: Run test to verify it passes**

Run: `npm run lint`
Expected: lint passes and setup files are in place.

**Step 5: Commit**

```bash
git add supabase/migrations/20260313000000_phase_0_foundation.sql .env.example README.md package.json
git commit -m "docs: add phase 0 setup workflow"
```

### Task 4: Add PWA baseline

**Files:**
- Modify: `next.config.ts`
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png`
- Create: `public/icons/icon-512.png`
- Create: `src/app/manifest.ts`
- Create: `src/app/icon.png`
- Test: `npm run build`

**Step 1: Write the failing test**

Enable the planned PWA integration in config before adding manifest/icon assets.

**Step 2: Run test to verify it fails**

Run: `npm run build`
Expected: build fails because manifest/icon/PWA assets are missing or misconfigured.

**Step 3: Write minimal implementation**

Add the manifest metadata, placeholder icons, and conservative PWA plugin/configuration compatible with the Next.js baseline.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Expected: build succeeds with the PWA baseline enabled.

**Step 5: Commit**

```bash
git add next.config.ts public src/app/manifest.ts src/app/icon.png
git commit -m "feat: add phase 0 pwa baseline"
```

### Task 5: Verify deployment readiness

**Files:**
- Modify: `README.md`
- Create: `vercel.json` (only if required by chosen setup)
- Test: `npm run lint`
- Test: `npm run build`

**Step 1: Write the failing test**

Run the full verification commands before deployment/setup guidance is complete.

**Step 2: Run test to verify it fails**

Run: `npm run lint && npm run build`
Expected: at least one command fails until all foundation pieces are wired correctly.

**Step 3: Write minimal implementation**

Fill any remaining deployment/setup gaps, add `vercel.json` only if the default build behavior needs explicit configuration, and ensure README deployment guidance is complete.

**Step 4: Run test to verify it passes**

Run: `npm run lint && npm run build`
Expected: both commands pass; document any blocked external prerequisites such as missing real Supabase credentials.

**Step 5: Commit**

```bash
git add README.md vercel.json
git commit -m "chore: verify phase 0 deployment readiness"
```
