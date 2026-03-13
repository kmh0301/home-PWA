# Stack Research: Home PWA

Date: 2026-03-13
Project: Home PWA
Inputs: `.planning/PROJECT.md`, `package.json`, `docs/PRD.md`, `.planning/research/ARCHITECTURE.md`

## Recommended Stack

### Frontend application

- **Next.js 16.x (App Router)**  
  Why: the repo already uses Next.js 16, and it remains a strong fit for an installable web app that needs server rendering, server actions, API routes, and deployment on Vercel without adding operational overhead.  
  Confidence: High

- **React 19.x**  
  Why: already present in the project, aligns with modern App Router patterns, and supports the current frontend direction without introducing migration churn.  
  Confidence: High

- **TypeScript 5.x**  
  Why: the domain has enough state, money logic, and background workflow coordination that strong typing is a material risk reducer rather than a preference.  
  Confidence: High

### Styling and UI

- **Tailwind CSS 4.x**  
  Why: already configured, efficient for mobile-first layout work, and a good fit for building a design system that can move quickly through dashboard, finance, and chores surfaces.  
  Confidence: High

- **shadcn/ui-style component approach on top of Tailwind**  
  Why: the PRD already points in this direction, and the product needs controllable primitives rather than a heavy opinionated component suite.  
  Confidence: High

- **Lucide icons**  
  Why: already installed and sufficient for a clean SVG icon system that replaces placeholder emoji in production UI.  
  Confidence: High

### Backend and data

- **Supabase Auth + Postgres + Storage + Realtime**  
  Why: this is the cleanest low-ops backend for household auth, shared data, storage-backed attachments, realtime partner activity, and RLS-enforced tenant isolation. It also matches the current repo direction and PRD implementation notes.  
  Confidence: High

- **Postgres Row Level Security with RPC-first financial mutations**  
  Why: household isolation and auditable financial state are core product requirements. Expense recording, settlement, transfers, repayments, and balance adjustments should happen through database functions or carefully controlled transaction boundaries, not loose client writes.  
  Confidence: High

- **Supabase Edge Functions for scheduled jobs**  
  Why: monthly settlement creation, monthly review snapshots, AI recommendation generation, and reminder fan-out all need idempotent server-owned background execution close to the data.  
  Confidence: High

### PWA and device capabilities

- **`@ducanh2912/next-pwa`**  
  Why: already installed and appropriate for service worker registration, caching strategy integration, and installable PWA behavior within the current Next.js setup.  
  Confidence: High

- **IndexedDB-backed local cache/queue layer**  
  Why: the product needs offline-capable reads and carefully scoped deferred writes. Use IndexedDB for cached household views and idempotent sync queue metadata rather than relying on transient memory state.  
  Confidence: Medium

- **Web Push with capability detection and in-app fallback**  
  Why: reminder value is real, but iOS PWA push has install and permission constraints. Push should be additive, not required for core workflows.  
  Confidence: High

### AI layer

- **Server-side AI integration through Next.js API routes**  
  Why: prompts, model selection, timeout control, attachment validation, and structured normalization should stay on the server. The client should only submit text/images and render confirmation states.  
  Confidence: High

- **Gemini 2.5 Flash as the initial extraction and coaching model**  
  Why: this matches the PRD and is a reasonable v1 choice for low-latency structured extraction and periodic guidance, provided cost and correction rates are instrumented early.  
  Confidence: Medium

- **Zod for schema validation on AI outputs**  
  Why: already installed and appropriate for validating extracted fields before any user-facing confirmation form or persistence step.  
  Confidence: High

### Deployment and operations

- **Vercel for app hosting**  
  Why: already implied by the stack and consistent with a low-ops deployment path for Next.js.  
  Confidence: High

- **Git-based planning plus branch protection and CI later**  
  Why: planning artifacts are part of delivery governance in this workflow and should stay versioned with the product.  
  Confidence: Medium

## Recommended Implementation Shape

1. Keep the web app in Next.js.
2. Keep auth, storage, realtime, and core data in Supabase.
3. Put financial invariants in Postgres/RPC boundaries, not React or client actions.
4. Keep AI as a draft-generation system with mandatory confirmation.
5. Scope offline support to cached reads and selected queued writes with idempotency keys.
6. Add push only after install/capability handling is explicit.

## What Not To Use

- **Do not use direct bank sync in v1.**  
  Why not: high integration cost, support burden, and region-specific reliability issues; it does not validate the core household-collaboration thesis.

- **Do not use a heavy client-state architecture as the source of financial truth.**  
  Why not: this product has settlement, account events, and audit requirements that belong in durable server-side transactions.

- **Do not use autonomous AI posting for expenses.**  
  Why not: the product’s trust model requires user confirmation before persistence.

- **Do not optimize for generic multi-household product logic yet.**  
  Why not: the current product promise and most complex rules are explicitly couples-first.

- **Do not overcommit to offline writes for sensitive finance flows in v1.**  
  Why not: duplicate or conflicting ledger mutations are more damaging than temporarily unavailable writes.

## Open Questions That Affect The Stack

- Whether Gemini 2.5 Flash remains inside acceptable latency and cost budgets once receipt/image volume is real.
- Whether photo storage limits and image processing should stay entirely inside Supabase Storage or require additional lifecycle tooling.
- Whether the current repo should keep all domain logic in one Next.js app or split background-job ownership more explicitly as the product matures.

## Bottom Line

The most defensible stack is the one the repo is already converging toward: **Next.js 16 + React 19 + TypeScript + Tailwind + Supabase + Vercel**, with **PWA support, RPC-backed financial writes, server-owned AI flows, and selective offline support**. That stack is fast enough for v1, low-ops enough for iteration, and strong enough to support the product’s trust-sensitive finance and household-collaboration requirements.
