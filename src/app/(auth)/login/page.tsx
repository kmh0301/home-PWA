import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  Shield,
  ShoppingBasket,
} from "lucide-react";
import {
  Cormorant_Garamond,
  Inter,
  Noto_Serif_TC,
} from "next/font/google";

import {
  signInAction,
  signUpAction,
} from "@/app/(auth)/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-login-sans",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500"],
  variable: "--font-login-display",
});

const notoSerifTc = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-login-serif-cjk",
});

type LoginPageProps = {
  searchParams?: Promise<{
    mode?: string;
    error?: string;
    message?: string;
    next?: string;
  }>;
};

type SummaryItem = {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  text: string;
};

const familySummary: SummaryItem[] = [
  {
    icon: ShoppingBasket,
    label: "GROCERIES",
    text: "今晚買餸清單等待確認",
  },
  {
    icon: CalendarRange,
    label: "SCHEDULE",
    text: "家庭行事與飯桌安排已同步",
  },
  {
    icon: CircleDollarSign,
    label: "BUDGET",
    text: "共享預算與家務輪值一眼睇晒",
  },
];

function serifClassName() {
  return `${cormorant.variable} ${notoSerifTc.variable} font-[var(--font-login-display),var(--font-login-serif-cjk),serif]`;
}

function sansClassName() {
  return `${inter.variable} font-[var(--font-login-sans),sans-serif]`;
}

function FieldLine({
  id,
  label,
  name,
  type = "text",
  autoComplete,
  autoCapitalize,
  spellCheck,
  placeholder,
  required = true,
}: {
  id: string;
  label: string;
  name: string;
  type?: React.ComponentProps<typeof Input>["type"];
  autoComplete?: string;
  autoCapitalize?: React.ComponentProps<typeof Input>["autoCapitalize"];
  spellCheck?: boolean;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div className="flex w-full flex-col gap-2 border-b border-[#d9c6b8] pb-[14px]">
      <label
        htmlFor={id}
        className={`${sansClassName()} text-xs font-semibold tracking-[0.08em] text-[#a08370]`}
      >
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        placeholder={placeholder}
        required={required}
        className={`${serifClassName()} h-auto rounded-none border-0 bg-transparent px-0 py-0 text-[1.375rem] leading-none text-[#5a3728] shadow-none placeholder:text-[#5a3728] focus-visible:ring-0 focus-visible:ring-offset-0 md:text-[1.375rem]`}
      />
    </div>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const mode = params.mode === "register" ? "register" : "login";
  const next = params.next ?? "/";
  const statusTone = params.error ? "error" : params.message ? "success" : null;
  const isRegister = mode === "register";

  const heroTitle = isRegister
    ? "建立你哋的共享家庭空間。"
    : "登入返到你哋今晚嘅家庭總覽。";
  const heroCopy = isRegister
    ? "買餸、家務、飯桌安排同共享支出，會喺建立帳戶之後放進同一個清楚的入口。"
    : "買餸、家務、飯桌安排同共享支出，應該喺同一個入口後面清楚接住。";
  const formTitle = isRegister ? "建立共享家庭空間" : "登入返到家庭空間";
  const formCopy = isRegister
    ? "完成註冊之後，你可以開始整理共享預算、家務輪值和今晚安排。"
    : "即刻查看今晚行程、購物安排同共享預算更新。";

  return (
    <main
      className={`${sansClassName()} min-h-screen bg-[#fff7f1] text-[#5a3728]`}
    >
      <section className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-6 py-5 lg:grid lg:min-h-[960px] lg:grid-cols-[760px_540px] lg:gap-0 lg:px-0 lg:py-0">
        <div className="flex flex-col gap-3 lg:bg-[#f7ecdf] lg:px-24 lg:py-24">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7b66] lg:text-[12px] lg:tracking-[0.12em]">
            今晚上線 / 家庭總覽入口
          </p>
          <h1
            className={`${serifClassName()} max-w-full text-[2.125rem] leading-none tracking-tight text-[#5a3728] lg:max-w-[600px] lg:text-[68px] lg:leading-[0.98]`}
          >
            {heroTitle}
          </h1>
          <p className="max-w-full text-sm leading-6 text-[#8a6b57] lg:max-w-[560px] lg:text-[17px] lg:leading-[1.6]">
            {heroCopy}
          </p>

          {!isRegister ? (
            <div className="hidden w-full max-w-[590px] flex-col gap-0 lg:flex">
              {familySummary.map(({ icon: Icon, label, text }) => (
                <div
                  key={label}
                  className="flex w-full items-center gap-[14px] border-b border-[#e8d8c9] py-[14px]"
                >
                  <Icon
                    className="size-4 shrink-0 text-[#c9735a]"
                    aria-hidden={true}
                  />
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b15f48]">
                      {label}
                    </span>
                    <span className="text-[15px] font-semibold text-[#5a3728]">
                      {text}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-[14px] pb-7 lg:px-[52px] lg:pt-[84px] lg:pr-16 lg:pb-[84px]">
          <div className="hidden h-[72px] w-px bg-[#d9c6b8] lg:block" />

          <div className="flex flex-col gap-[14px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a08370]">
              FAMILY ACCESS
            </p>
            <h2
              className={`${serifClassName()} text-[2.125rem] leading-none text-[#5a3728] lg:text-[46px]`}
            >
              {formTitle}
            </h2>
            <p className="max-w-full text-sm leading-6 text-[#8a6b57] lg:max-w-[420px] lg:text-base">
              {formCopy}
            </p>
          </div>

          {statusTone ? (
            <Alert
              aria-live="polite"
              className={cn(
                "rounded-none border-x-0 border-b-0 border-t bg-transparent px-0 py-4",
                statusTone === "error"
                  ? "border-destructive/30 text-destructive"
                  : "border-[color:var(--positive)]/30 text-[color:var(--positive)]",
              )}
            >
              <AlertTitle className="text-sm font-semibold">
                {statusTone === "error" ? "請先處理以下問題" : "請查看你的電郵"}
              </AlertTitle>
              <AlertDescription>{params.error ?? params.message}</AlertDescription>
            </Alert>
          ) : null}

          <form
            action={isRegister ? signUpAction : signInAction}
            className="flex w-full flex-col gap-[18px] lg:max-w-[460px]"
          >
            <input name="next" type="hidden" value={next} />

            {isRegister ? (
              <FieldLine
                id="displayName"
                name="displayName"
                label="顯示名稱"
                autoComplete="nickname"
                autoCapitalize="words"
                placeholder="例如：阿晴"
              />
            ) : null}

            <FieldLine
              id="email"
              name="email"
              label="電郵地址"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
            />

            <FieldLine
              id="password"
              name="password"
              label="密碼"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              placeholder="••••••••"
            />

            {isRegister ? (
              <FieldLine
                id="passwordConfirm"
                name="passwordConfirm"
                label="確認密碼"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
              />
            ) : null}

            <div className="flex flex-col gap-[14px] pt-1">
              <Button
                type="submit"
                className="h-auto w-full rounded-none bg-[#c9735a] px-[18px] py-[15px] text-[13px] font-semibold text-[#fff8f2] hover:bg-[#bf6b53]"
              >
                {isRegister ? "建立帳戶並開始協作" : "登入並查看今晚安排"}
                <ArrowRight data-icon="inline-end" />
              </Button>

              <Link
                href={isRegister ? `/login?next=${encodeURIComponent(next)}` : "/onboarding/join"}
                className="text-[13px] font-semibold text-[#b15f48] transition-colors hover:text-[#9c543b]"
              >
                {isRegister ? "已有帳戶，返回登入" : "改用邀請連結進入"}
              </Link>
            </div>
          </form>

          <div className="flex w-full items-start gap-[10px] lg:max-w-[460px]">
            <Shield className="mt-0.5 size-4 shrink-0 text-[#c9735a]" aria-hidden="true" />
            <p className="max-w-full text-xs leading-5 text-[#8a6b57] lg:max-w-[430px]">
              登入後會恢復最近一次家庭進度、任務同支出脈絡。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
