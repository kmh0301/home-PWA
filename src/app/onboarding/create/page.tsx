import Link from "next/link";

import { createHouseholdAction } from "@/app/onboarding/actions";
import { ShareInviteCodeButton } from "@/components/share-invite-code-button";

type OnboardingCreatePageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
    householdName?: string;
    inviteCode?: string;
    expiresAt?: string;
  }>;
};

export default async function OnboardingCreatePage({
  searchParams,
}: OnboardingCreatePageProps) {
  const params = (await searchParams) ?? {};

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        1 / 2 Household setup
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        Name your household
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        Create your two-person household first. After creation, share the invite code
        with your partner before moving into account setup.
      </p>
      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}
      {params.success && params.inviteCode ? (
        <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-semibold">Household created: {params.householdName}</p>
          <p className="mt-2">
            Invite code: <span className="font-mono text-base">{params.inviteCode}</span>
          </p>
          <p className="mt-1 text-xs">
            Expires: {params.expiresAt ? new Date(params.expiresAt).toLocaleString() : "24 hours"}
          </p>
          <ShareInviteCodeButton
            code={params.inviteCode}
            householdName={params.householdName ?? "your household"}
          />
          <Link
            href="/onboarding/accounts"
            className="mt-4 inline-flex text-sm font-semibold text-emerald-800 underline"
          >
            Continue to account setup
          </Link>
        </div>
      ) : null}
      <form action={createHouseholdAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
            Household name
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
            name="householdName"
            placeholder="Alex & Sam's home"
          />
        </label>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Create household
        </button>
      </form>
      <Link
        href="/onboarding/join"
        className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)]"
      >
        I already have an invite code
      </Link>
    </section>
  );
}
