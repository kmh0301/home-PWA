## Why

The repository currently contains product and database planning documents but no implementation baseline. Phase 0 is needed to turn the plan into an executable foundation so later onboarding and finance work can be built on a stable Next.js, Supabase, auth, PWA, and deployment setup instead of ad hoc scaffolding.

## What Changes

- Initialize a Next.js App Router application with TypeScript, Tailwind, shadcn/ui, path aliases, linting, formatting, and a minimal mobile-first shell.
- Add Supabase integration scaffolding, including environment contracts, generated database types location, server/client helpers, and a migration entrypoint for the planned schema.
- Add authentication foundation with middleware-based route protection, auth callback handling, and session access patterns for server and client components.
- Add PWA baseline assets and configuration, including manifest, icons placeholder structure, and service worker support suitable for later offline expansion.
- Add deployment and developer workflow foundation for Vercel previews, environment setup, and basic project documentation for Phase 0 verification.

## Capabilities

### New Capabilities
- `app-foundation`: Establish the Next.js application baseline, UI shell, shared providers, tooling, and project structure required for all later phases.
- `supabase-auth-foundation`: Establish Supabase connectivity, database typing/migration workflow, auth callback handling, and protected route infrastructure.
- `pwa-deployment-foundation`: Establish the PWA manifest/service worker baseline and Vercel deployment configuration needed to validate installability and preview delivery.

### Modified Capabilities

None.

## Impact

- Affects repository structure, package dependencies, environment variable contracts, and developer onboarding.
- Introduces initial App Router routes, shared libraries, middleware, Supabase utilities, and PWA assets/configuration.
- Establishes the implementation baseline that all subsequent Phase 1+ application flows will depend on.
