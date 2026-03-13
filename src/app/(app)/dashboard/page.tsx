const cards = [
  {
    title: "Foundation Status",
    value: "In progress",
    detail: "OpenSpec Phase 0 is wiring the app shell, auth, PWA, and deployment baseline.",
  },
  {
    title: "Auth guard",
    value: "Ready",
    detail: "Middleware and callback route will handle session entry before onboarding logic lands.",
  },
  {
    title: "Next slice",
    value: "Phase 1",
    detail: "Household onboarding and invite flow will attach to this protected app shell.",
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-[28px] bg-[var(--color-panel)] px-5 py-6">
        <p className="text-sm font-medium text-[var(--color-muted)]">Protected shell</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--color-foreground)]">
          Dashboard foundation is live
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--color-muted)]">
          This screen is intentionally thin. It proves routing, shell composition, and
          future mobile-first layout constraints before the real product flows arrive.
        </p>
      </div>

      <div className="space-y-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="rounded-[24px] border border-[var(--color-border)] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-[var(--color-muted)]">{card.title}</h3>
              <p className="text-sm font-semibold text-[var(--color-accent)]">{card.value}</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-foreground)]">
              {card.detail}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
