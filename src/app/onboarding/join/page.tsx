import Link from "next/link";

import { claimInviteAction, validateInviteAction } from "@/app/onboarding/actions";
import { getOnboardingState } from "@/lib/onboarding/state";

type OnboardingJoinPageProps = {
  searchParams?: Promise<{
    error?: string;
    inviteCode?: string;
    householdName?: string;
    expiresAt?: string;
    creatorDisplayName?: string;
    memberCount?: string;
    displayName?: string;
    valid?: string;
  }>;
};

export default async function OnboardingJoinPage({
  searchParams,
}: OnboardingJoinPageProps) {
  const params = (await searchParams) ?? {};
  const onboardingState = await getOnboardingState();
  const displayName =
    params.displayName?.trim() ||
    String(onboardingState.user?.user_metadata?.display_name ?? "").trim() ||
    onboardingState.user?.email?.split("@")[0] ||
    "";
  const expiresAtLabel = params.expiresAt
    ? new Date(params.expiresAt).toLocaleString("zh-HK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;
  const memberCount = Number(params.memberCount ?? "0");

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        1 / 2 加入家庭
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        先核對你要加入的家庭
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        請輸入夥伴交給你的 6 位邀請碼。我們會先顯示家庭名稱、建立者和目前成員狀態，確認無誤後你再正式加入。
      </p>
      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}
      <form action={validateInviteAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
            邀請碼
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 uppercase tracking-[0.4em] outline-none transition focus:border-[var(--color-accent)]"
            name="inviteCode"
            maxLength={6}
            defaultValue={params.inviteCode ?? ""}
            placeholder="ABC123"
          />
        </label>
        <p className="text-xs leading-5 text-[var(--color-muted)]">
          如果顯示已過期、已使用或家庭已滿，請直接向對方索取新的邀請碼。
        </p>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          查看家庭資料
        </button>
      </form>
      {params.valid && params.householdName ? (
        <form action={claimInviteAction} className="mt-6 rounded-[24px] bg-[var(--color-panel)] px-4 py-4">
          <input name="inviteCode" type="hidden" value={params.inviteCode ?? ""} />
          <input name="householdName" type="hidden" value={params.householdName} />
          <input name="expiresAt" type="hidden" value={params.expiresAt ?? ""} />
          <input
            name="creatorDisplayName"
            type="hidden"
            value={params.creatorDisplayName ?? ""}
          />
          <input name="memberCount" type="hidden" value={params.memberCount ?? ""} />
          <p className="text-sm font-semibold text-[var(--color-foreground)]">準備加入「{params.householdName}」</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
            只要確認以下資料正確，你就會和夥伴進入同一個家庭空間。
          </p>
          <div className="mt-4 space-y-2 rounded-2xl border border-[var(--color-border)] bg-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                家庭
              </span>
              <span className="text-sm font-semibold text-[var(--color-foreground)]">
                {params.householdName}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                建立者
              </span>
              <span className="text-sm text-[var(--color-foreground)]">
                {params.creatorDisplayName ?? "夥伴"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                現有成員
              </span>
              <span className="text-sm text-[var(--color-foreground)]">
                {Number.isFinite(memberCount) && memberCount > 0 ? `${memberCount} 位` : "-"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-muted)]">
                邀請有效至
              </span>
              <span className="text-right text-sm text-[var(--color-foreground)]">
                {expiresAtLabel ?? "-"}
              </span>
            </div>
          </div>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
              你的顯示名稱
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="displayName"
              defaultValue={displayName}
              placeholder="例如：阿晴"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-[var(--color-muted)]">
            確認後會立即完成加入，下一步才是設定你的常用付款帳戶，不會重複要求你再確認一次家庭。
          </p>
          <button
            type="submit"
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            確認加入這個家庭
          </button>
        </form>
      ) : null}
      <Link
        href="/onboarding/create"
        className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)]"
      >
        我想先建立自己的家庭
      </Link>
    </section>
  );
}
