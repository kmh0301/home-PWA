import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Auth entrypoint
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
          Login UI lands in Phase 1
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
          Phase 0 only establishes the route boundary, callback handling, and protected
          application shell. Real login and registration forms arrive in the onboarding
          phase.
        </p>
        <div className="mt-6 rounded-2xl bg-[var(--color-panel)] px-4 py-4 text-sm text-[var(--color-foreground)]">
          Current expectation: configure Supabase env vars, complete OAuth provider setup,
          and use this route as the public auth landing page.
        </div>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Preview protected shell
        </Link>
      </div>
    </main>
  );
}
