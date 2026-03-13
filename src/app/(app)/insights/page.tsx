export default function InsightsPage() {
  return (
    <section className="rounded-[28px] bg-[var(--color-panel)] px-5 py-6">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        Insights placeholder
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
        Analytics surfaces are intentionally deferred
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
        The route is present so navigation, middleware, and app-shell structure stay
        stable once monthly review and annual review features are introduced later.
      </p>
    </section>
  );
}
