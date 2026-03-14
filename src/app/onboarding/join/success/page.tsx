import Link from "next/link";

type OnboardingJoinSuccessPageProps = {
  searchParams?: Promise<{
    householdName?: string;
  }>;
};

export default async function OnboardingJoinSuccessPage({
  searchParams,
}: OnboardingJoinSuccessPageProps) {
  const params = (await searchParams) ?? {};
  const householdName = params.householdName?.trim() || "你的家庭";

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        已成功加入家庭
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        你已成功加入家庭
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        你已經加入「{householdName}」。這一步已經完成，下一步只需設定常用付款帳戶，就可以開始一起記帳、追蹤支出和安排家務。
      </p>
      <div className="mt-6 rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4">
        <p className="text-sm font-semibold text-emerald-900">{householdName}</p>
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          你的家庭席位已經保留完成，之後只需要補上付款帳戶設定，就可以和夥伴看到同一套共享資料。
        </p>
      </div>
      <div className="mt-4 rounded-[24px] bg-[var(--color-panel)] px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
          下一步
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
          選擇你平時最常用的付款方式。即使現在先略過，之後也可以在帳戶設定補回。
        </p>
      </div>
      <Link
        href="/onboarding/accounts?joined=1"
        className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        進入付款帳戶設定
      </Link>
    </section>
  );
}
