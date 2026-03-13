# Home Collaboration PWA

Phase 0 foundation for a two-person household home management PWA. This repository now contains the executable application baseline that the planning docs in `docs/` and the OpenSpec change in `openspec/changes/phase-0-foundation/` depend on.

## Phase 0 scope

- Next.js App Router + TypeScript + Tailwind baseline
- Mobile-first protected app shell with public/protected route split
- Supabase SSR helper pattern for server, browser, and middleware usage
- Auth callback route and middleware-based route protection
- PWA manifest + offline fallback + service-worker-compatible config
- Local setup and Vercel preview deployment documentation

## Environment variables

Copy `.env.example` to `.env.local` and provide:

- `NEXT_PUBLIC_APP_URL`: local app origin, usually `http://localhost:3000`
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

## Local development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```

## Supabase workflow

The planning schema source of truth currently lives at `docs/plans/DB-SCHEMA.sql`.

Phase 0 adds the migration entrypoint at:

- `supabase/migrations/20260313000000_phase_0_foundation.sql`

Recommended commands once the Supabase CLI is linked to the target project:

```bash
supabase db push
supabase gen types typescript --linked > src/types/database.types.ts
```

## Auth routing baseline

- Public auth route: `/login`
- OAuth callback route: `/auth/callback`
- Protected shell entrypoint: `/dashboard`

Middleware currently handles coarse session gating only. Household state and onboarding flow decisions are intentionally deferred to Phase 1.

## PWA baseline

- Manifest route: `src/app/manifest.ts`
- Static manifest mirror: `public/manifest.json`
- Offline fallback route: `/~offline`
- Service worker config: `next.config.ts`

Phase 0 only caches the shell baseline. Rich offline sync and push behavior are deferred.

## Vercel preview deployment

1. Link the repository to a Vercel project.
2. Configure the same public env vars from `.env.example` in the Vercel project.
3. Keep preview deployments enabled for non-production branches.
4. Use `npm run build` locally before pushing if the baseline changes.

No `vercel.json` override is required right now; the default Next.js build pipeline is sufficient for Phase 0.

## External prerequisites still required

- A real Supabase project plus valid public env vars
- Supabase CLI linked to the target project before applying migrations or generating final database types
- OAuth providers configured in Supabase before Phase 1 login UI is implemented
- Final branded PWA icons if placeholder assets are no longer acceptable
