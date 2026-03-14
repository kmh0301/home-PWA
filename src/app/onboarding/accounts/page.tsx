import {
  completeAccountSetupAction,
  skipAccountSetupAction,
} from "@/app/onboarding/actions";

const presetAccounts = [
  { key: "alipay_hk", label: "Alipay HK", type: "alipay_hk", defaultChecked: true },
  { key: "payme", label: "PayMe", type: "payme", defaultChecked: true },
  { key: "cash", label: "Cash", type: "cash", defaultChecked: true },
  { key: "credit_card", label: "Credit Card", type: "credit_card", defaultChecked: false },
] as const;

type OnboardingAccountsPageProps = {
  searchParams?: Promise<{
    error?: string;
    joined?: string;
  }>;
};

export default async function OnboardingAccountsPage({
  searchParams,
}: OnboardingAccountsPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <section className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
        2 / 2 付款帳戶設定
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
        設定你常用的付款帳戶
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        開啟你實際會用到的付款方式，填寫起始結餘即可。如果你想之後再整理，現在先略過也可以。
      </p>
      {params.joined ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          你已經完成加入家庭。這一頁只是補上你的付款帳戶資料，完成後就可以直接進入 App。
        </div>
      ) : null}
      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}
      <form action={completeAccountSetupAction} className="mt-6 space-y-4">
        {presetAccounts.map((account) => (
          <div
            key={account.key}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-3 text-sm font-medium text-[var(--color-foreground)]">
                <input
                  defaultChecked={account.defaultChecked}
                  name={`enabled:${account.key}`}
                  type="checkbox"
                />
                {account.label}
              </label>
              <input name={`name:${account.key}`} type="hidden" value={account.label} />
            </div>
            {account.type === "credit_card" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[var(--color-muted)]">
                    信用額
                  </span>
                  <input
                    className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                    name={`limit:${account.key}`}
                    placeholder="例如：20000"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-medium text-[var(--color-muted)]">
                    已用金額
                  </span>
                  <input
                    className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                    name={`used:${account.key}`}
                    placeholder="例如：3500"
                  />
                </label>
              </div>
            ) : (
              <label className="mt-3 block">
                <span className="mb-2 block text-xs font-medium text-[var(--color-muted)]">
                  起始結餘
                </span>
                <input
                  className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                  name={`balance:${account.key}`}
                  placeholder="例如：500"
                />
              </label>
            )}
          </div>
        ))}

        <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-4">
          <label className="flex items-center gap-3 text-sm font-medium text-[var(--color-foreground)]">
            <input name="custom:enabled" type="checkbox" />
            加入其他付款帳戶
          </label>
          <div className="mt-3 grid gap-3">
            <input
              className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="custom:name"
              placeholder="自訂帳戶名稱"
            />
            <select
              className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="custom:type"
              defaultValue="custom"
            >
              <option value="custom">自訂</option>
              <option value="cash">現金</option>
              <option value="payme">PayMe</option>
              <option value="alipay_hk">Alipay HK</option>
              <option value="credit_card">信用卡</option>
            </select>
            <input
              className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="custom:balance"
              placeholder="起始結餘"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                name="custom:limit"
                placeholder="信用額"
              />
              <input
                className="h-11 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                name="custom:used"
                placeholder="已用金額"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            完成設定並繼續
          </button>
          <button
            type="submit"
            formAction={skipAccountSetupAction}
            className="flex h-12 items-center justify-center rounded-full border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-foreground)]"
          >
            之後再處理
          </button>
        </div>
      </form>
    </section>
  );
}
