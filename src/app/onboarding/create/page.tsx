import Link from "next/link";

import {
  createHouseholdAction,
  regenerateInviteAction,
} from "@/app/onboarding/actions";
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
  const householdName = params.householdName?.trim() || "你的家庭";
  const inviteCode = params.inviteCode?.trim().toUpperCase() || "";
  const expiresAtDate = params.expiresAt ? new Date(params.expiresAt) : null;
  const hasValidExpiry = Boolean(expiresAtDate && !Number.isNaN(expiresAtDate.getTime()));
  const expiresAtLabel = hasValidExpiry
    ? expiresAtDate!.toLocaleString("zh-HK", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "24 小時內";

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        1 / 2 建立家庭
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        先為你們的家庭命名
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        先建立你們共用的家庭空間，之後把 6 位邀請碼交給另一半。對方完成加入後，你們就會進入同一個家庭帳本。
      </p>
      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}
      {params.success && inviteCode ? (
        <div
          className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">「{householdName}」已準備好</p>
              <p className="mt-1 text-xs leading-5">
                現在只差把邀請碼傳給對方，對方登入後輸入即可加入。
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold tracking-[0.18em]">
              6 位邀請碼
            </span>
          </div>
          <div className="mt-4 rounded-[24px] border border-white/70 bg-white px-4 py-4 text-[var(--color-foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
              邀請碼
            </p>
            <p className="mt-2 font-mono text-[2rem] font-semibold tracking-[0.42em] text-[var(--color-foreground)]">
              {inviteCode}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="rounded-full bg-[var(--color-panel)] px-3 py-1.5 text-[var(--color-foreground)]">
                家庭名稱：{householdName}
              </span>
              <span className="text-[var(--color-muted)]">有效至 {expiresAtLabel}</span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5">
            最自然的交接方式是直接貼到 WhatsApp 或當面讀出這 6 個字元。如果這組邀請碼過期，可即時重新產生新碼，舊碼會保留為過期紀錄。
          </p>
          <ShareInviteCodeButton
            code={inviteCode}
            householdName={householdName}
            expiresAtLabel={expiresAtLabel}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <form action={regenerateInviteAction} className="flex-1">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
              >
                邀請碼過期？重新產生新碼
              </button>
            </form>
            <Link
              href="/onboarding/accounts"
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90"
            >
              先去設定付款帳戶
            </Link>
          </div>
        </div>
      ) : null}
      <form action={createHouseholdAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
            家庭名稱
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
            name="householdName"
            placeholder="例如：阿晴與阿峰的小屋"
          />
        </label>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          建立家庭並產生邀請碼
        </button>
      </form>
      <Link
        href="/onboarding/join"
        className="mt-6 inline-flex text-sm font-semibold text-[var(--color-accent)]"
      >
        我已經有邀請碼，直接加入家庭
      </Link>
    </section>
  );
}
