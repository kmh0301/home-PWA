export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Offline fallback
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
          You are offline
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
          Phase 0 caches the application shell only. Data sync and richer offline behavior
          arrive later in the roadmap.
        </p>
      </div>
    </main>
  );
}
