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
        已成功加入
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        你已成功加入家庭
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        你已經加入「{householdName}」。下一步只需設定常用付款帳戶，就可以開始一起記帳和管理家務。
      </p>
      <div className="mt-6 rounded-[24px] bg-[var(--color-panel)] px-4 py-4">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">{householdName}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">
          完成付款帳戶設定後，你和夥伴就會進入同一個家庭空間。
        </p>
      </div>
      <Link
        href="/onboarding/accounts?joined=1"
        className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        繼續設定付款帳戶
      </Link>
    </section>
  );
}
