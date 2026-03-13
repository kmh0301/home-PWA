## Context

The repository currently holds product, page flow, design system, and database planning documents, but no application code. Phase 0 must create a production-oriented baseline that later phases can extend without refactoring core infrastructure. The stack is fixed by the plan: Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase, and Vercel. The design must also preserve the documented v1 scope boundary: infrastructure only, with no onboarding business flows implemented yet.

This is a cross-cutting change because routing, auth, data access, build tooling, PWA behavior, and deployment configuration all need to line up. The foundation also needs a migration path for the planned SQL schema and a predictable place for generated database types so subsequent features can stay type-safe.

## Goals / Non-Goals

**Goals:**
- Establish a runnable Next.js application baseline with App Router, TypeScript, Tailwind, shared layout, and mobile-first shell structure.
- Establish a Supabase integration pattern for server components, client components, middleware, and future server actions/routes.
- Establish auth infrastructure for session-aware routing and callback handling without implementing full onboarding UI yet.
- Establish a PWA baseline that exposes manifest metadata, installable assets, and service-worker-backed caching for the app shell.
- Establish project-level developer and deployment conventions so local setup, preview deploys, and future environment management are predictable.

**Non-Goals:**
- Implement login/register page UX, household creation/joining flows, invite validation, or payment account setup.
- Implement finance, chores, or dashboard business logic.
- Optimize offline data sync beyond basic shell caching.
- Finalize production brand assets; placeholder app icons are acceptable for Phase 0 as long as the file structure is correct.

## Decisions

### 1. Use App Router with a route-group split for public auth pages and protected application pages

The application will use a root layout plus route groups such as `(auth)` and `(app)` so later phases can add screens without reworking the shell. Protected routes will live under `(app)` and be guarded by middleware plus server-side session checks where needed.

Alternatives considered:
- Flat route tree with ad hoc per-page guards: rejected because later navigation expansion becomes harder to keep consistent.
- Client-only auth gating: rejected because it creates hydration flicker and weakens route protection.

### 2. Keep Supabase integration server-first with narrowly scoped client helpers

Server-side helpers will be the default for reading session/user context in layouts, pages, route handlers, and server actions. Client-side Supabase usage will be limited to cases that truly need browser interaction. This follows the stated React/Next constraint to avoid pushing core auth and data flow into client state too early.

Alternatives considered:
- Central client auth provider for the whole app: rejected because it increases client bundle size and creates redundant session fetching.
- Raw Supabase calls sprinkled across files: rejected because it destroys consistency and type-safety.

### 3. Store the planned schema as a first-class migration input and generate shared database types into `src/types`

`docs/plans/DB-SCHEMA.sql` is the source planning artifact, but implementation needs an executable migration entrypoint. The foundation will add a Supabase migration workflow and reserve `src/types/database.types.ts` for generated types so later features use a single schema contract.

Alternatives considered:
- Copy-paste SQL manually during setup only: rejected because it is not reproducible.
- Delay database typing until feature work begins: rejected because Phase 1+ would then grow on an untyped foundation.

### 4. Use middleware for coarse-grained route protection and keep business rules out of middleware

Middleware will enforce whether a session exists and redirect between public and protected route groups. It will not decide household state, onboarding completion, or fine-grained authorization. Those concerns belong in page/server logic after the user identity is known.

Alternatives considered:
- Put all onboarding routing logic into middleware: rejected because it couples business state to edge logic and becomes brittle.
- Skip middleware and rely only on page guards: rejected because protected routes would still render too late.

### 5. Start with a conservative PWA baseline using a maintained Next.js-compatible plugin

Phase 0 only needs installability, manifest exposure, icon plumbing, and basic app-shell caching. The implementation should favor a maintained integration with App Router and minimal custom service-worker logic so the later push/offline work in Phase 7 has a stable base instead of a bespoke worker to unwind.

Alternatives considered:
- Hand-roll the service worker in Phase 0: rejected because the project has no runtime code yet and the maintenance cost is unjustified.
- Defer all PWA work to Phase 7: rejected because shell structure, assets, and deploy behavior are easier to validate early.

### 6. Treat Vercel deployment setup as codebase documentation plus checked-in configuration, not a one-time manual step

Phase 0 will include the files and docs needed to run locally and deploy previews consistently, including environment variable documentation and any static config checked into the repo. Secret values remain out of source control.

Alternatives considered:
- Leave deployment knowledge implicit: rejected because future implementation would depend on tribal knowledge.

## Risks / Trade-offs

- [Supabase local tooling may not be installed or authenticated] -> Keep migration/docs structure in repo regardless, and verify what can be generated locally versus what must be documented for later execution.
- [PWA plugins can be finicky with App Router and build output] -> Choose a conservative plugin setup and verify build behavior before claiming the baseline is sound.
- [Middleware/auth setup can drift from future onboarding flows] -> Keep the guard focused on session presence only and document the handoff to Phase 1 routing logic.
- [Generated database types can become stale if schema application is manual] -> Document the generation command and expected output path, and treat regeneration as part of schema changes.

## Migration Plan

1. Scaffold the Next.js application and baseline tooling.
2. Add core dependencies for UI, Supabase, and PWA support.
3. Add route groups, layout shell, and shared providers.
4. Add Supabase environment contracts, helper modules, middleware, and auth callback route.
5. Add migration storage and generated-types location aligned with the planned schema.
6. Add manifest, icons placeholders, and service-worker configuration.
7. Add developer/deployment documentation and verify lint/build where possible.

Rollback is straightforward at this stage: revert the Phase 0 foundation commit set because there is no production data migration yet. If a deploy configuration proves unstable, disable the PWA integration first rather than backing out the app structure.

## Open Questions

- Whether the local environment already has Supabase CLI available for generating types and running migrations. If not, the foundation should still include commands and file layout, but the actual generated file may need a documented placeholder step.
- Whether the user wants placeholder brand icons committed now or prefers generated generic assets until visual design work starts.
