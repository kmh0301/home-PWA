import Link from "next/link";

import { claimInviteAction, validateInviteAction } from "@/app/onboarding/actions";

type OnboardingJoinPageProps = {
  searchParams?: Promise<{
    error?: string;
    inviteCode?: string;
    householdName?: string;
    expiresAt?: string;
    valid?: string;
  }>;
};

export default async function OnboardingJoinPage({
  searchParams,
}: OnboardingJoinPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        Join household
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        Enter your invite code
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        Your partner can create a household and share a six-character invite code. The
        code is validated before you confirm the join.
      </p>
      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}
      <form action={validateInviteAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
            Invite code
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 uppercase tracking-[0.4em] outline-none transition focus:border-[var(--color-accent)]"
            name="inviteCode"
            maxLength={6}
            defaultValue={params.inviteCode ?? ""}
            placeholder="ABC123"
          />
        </label>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Validate code
        </button>
      </form>
      {params.valid && params.householdName ? (
        <form action={claimInviteAction} className="mt-6 rounded-[24px] bg-[var(--color-panel)] px-4 py-4">
          <input name="inviteCode" type="hidden" value={params.inviteCode ?? ""} />
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Join {params.householdName}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Invite expires: {params.expiresAt ? new Date(params.expiresAt).toLocaleString() : "-"}
          </p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
              Display name
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="displayName"
              placeholder="How your partner sees you"
            />
          </label>
          <button
            type="submit"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Confirm join
          </button>
        </form>
      ) : null}
      <Link
        href="/onboarding/create"
        className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)]"
      >
        Back to create household
      </Link>
    </section>
  );
}
