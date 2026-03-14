import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  CircleDollarSign,
  ShoppingBasket,
} from "lucide-react";

import {
  resetPasswordAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/(auth)/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type LoginPageProps = {
  searchParams?: Promise<{
    mode?: string;
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const mode = params.mode === "register" ? "register" : "login";
  const next = params.next ?? "/";
  const statusTone = params.error ? "error" : params.message ? "success" : null;
  const title = mode === "register" ? "建立共享家庭空間" : "登入返到家庭空間";
  const description =
    mode === "register"
      ? "完成註冊之後，你可以開始整理共享預算、家務輪值和今晚安排。"
      : "即刻查看今晚行程、購物安排同共享預算更新。";
  const familySummary = [
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

  return (
    <main className="min-h-screen bg-[#fff7f1] text-[#5a3728]">
      <section className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-10 px-6 py-5 sm:px-8 md:justify-center md:px-12 md:py-12 lg:grid lg:grid-cols-[minmax(0,1fr)_540px] lg:gap-16 lg:px-16 xl:px-24">
        <div className="flex flex-col gap-5 lg:max-w-[640px] lg:gap-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9a7b66]">
            今晚上線 / 家庭總覽入口
          </p>
          <div className="flex flex-col gap-3">
            <h1 className="font-serif text-[2.125rem] leading-[0.98] tracking-tight text-[#5a3728] sm:text-5xl lg:text-[4.25rem]">
              {mode === "register" ? "建立你哋的共享家庭空間。" : "登入返到你哋今晚嘅家庭總覽。"}
            </h1>
            <p className="max-w-[35rem] text-sm leading-6 text-[#8a6b57] sm:text-base">
              {mode === "register"
                ? "買餸、家務、飯桌安排同共享支出，會喺建立帳戶之後放進同一個清楚的入口。"
                : "買餸、家務、飯桌安排同共享支出，應該喺同一個入口後面清楚接住。"}
            </p>
          </div>

          {mode === "login" ? (
            <div className="hidden max-w-[36.875rem] flex-col lg:flex">
              {familySummary.map(({ icon: Icon, label, text }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 border-b border-[#e8d8c9] py-3"
                >
                  <Icon className="size-4 text-[#c9735a]" aria-hidden="true" />
                  <p className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[0.625rem] font-bold uppercase tracking-[0.12em] text-[#b15f48]">
                      {label}
                    </span>
                    <span className="text-[0.95rem] font-semibold text-[#5a3728]">
                      {text}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="w-full lg:flex lg:justify-end">
          <div className="w-full max-w-[33.75rem] bg-transparent px-0 py-0 sm:px-0 lg:px-0">
            <div className="mb-5 hidden h-[4.5rem] w-px bg-[#d9c6b8] lg:block" />
            <div className="flex flex-col gap-2">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#a08370]">
                Family Access
              </p>
              <h2 className="font-serif text-[2.125rem] leading-none text-[#5a3728] sm:text-[2.875rem]">
                {title}
              </h2>
              <p className="max-w-[26rem] text-sm leading-6 text-[#8a6b57]">
                {description}
              </p>
            </div>

            {statusTone ? (
              <Alert
                aria-live="polite"
                className={cn(
                  "mt-5 rounded-none border-x-0 border-b-0 border-t px-0 py-4",
                  statusTone === "error"
                    ? "border-destructive/30 bg-transparent text-destructive"
                    : "border-[color:var(--positive)]/30 bg-transparent text-[color:var(--positive)]",
                )}
              >
                <AlertTitle className="text-sm font-semibold">
                  {statusTone === "error" ? "請先處理以下問題" : "請查看你的電郵"}
                </AlertTitle>
                <AlertDescription>
                  {params.error ?? params.message}
                </AlertDescription>
              </Alert>
            ) : null}

            <form
              action={mode === "register" ? signUpAction : signInAction}
              className="mt-6 flex flex-col gap-6"
            >
              <input name="next" type="hidden" value={next} />

              <FieldGroup className="gap-4">
                {mode === "register" ? (
                  <Field>
                    <FieldContent>
                      <FieldLabel
                        htmlFor="displayName"
                        className="text-xs font-semibold tracking-[0.08em] text-[#a08370]"
                      >
                        顯示名稱
                      </FieldLabel>
                      <Input
                        autoComplete="nickname"
                        autoCapitalize="words"
                        id="displayName"
                        name="displayName"
                        placeholder="例如：阿晴"
                        required
                        className="h-auto rounded-none border-x-0 border-t-0 border-b-[#d9c6b8] bg-transparent px-0 pb-3 pt-0 text-lg text-[#5a3728] placeholder:text-[#b79c8a] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <FieldDescription>
                        這個名稱會顯示在家庭邀請和共享紀錄中。
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                ) : null}

                <Field>
                  <FieldContent>
                    <FieldLabel
                      htmlFor="email"
                      className="text-xs font-semibold tracking-[0.08em] text-[#a08370]"
                    >
                      電郵地址
                    </FieldLabel>
                    <Input
                      autoCapitalize="none"
                      autoComplete="email"
                      id="email"
                      name="email"
                      spellCheck={false}
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="h-auto rounded-none border-x-0 border-t-0 border-b-[#d9c6b8] bg-transparent px-0 pb-3 pt-0 text-lg text-[#5a3728] placeholder:text-[#b79c8a] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel
                      htmlFor="password"
                      className="text-xs font-semibold tracking-[0.08em] text-[#a08370]"
                    >
                      密碼
                    </FieldLabel>
                    <Input
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="h-auto rounded-none border-x-0 border-t-0 border-b-[#d9c6b8] bg-transparent px-0 pb-3 pt-0 text-lg text-[#5a3728] placeholder:text-[#b79c8a] focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FieldContent>
                </Field>

                {mode === "register" ? (
                  <Field>
                    <FieldContent>
                      <FieldLabel
                        htmlFor="passwordConfirm"
                        className="text-xs font-semibold tracking-[0.08em] text-[#a08370]"
                      >
                        確認密碼
                      </FieldLabel>
                      <Input
                        autoComplete="new-password"
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="h-auto rounded-none border-x-0 border-t-0 border-b-[#d9c6b8] bg-transparent px-0 pb-3 pt-0 text-lg text-[#5a3728] placeholder:text-[#b79c8a] focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </FieldContent>
                  </Field>
                ) : null}
              </FieldGroup>

              <div className="flex flex-col gap-4">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 rounded-none bg-[#c9735a] px-6 text-sm font-semibold text-[#fff8f2] hover:bg-[#b8634a]"
                >
                  {mode === "register" ? "建立帳戶" : "登入"}
                  <ArrowRight data-icon="inline-end" />
                </Button>

                {mode === "login" ? (
                  <Button
                    type="submit"
                    formAction={resetPasswordAction}
                    variant="link"
                    className="h-auto justify-start px-0 text-sm font-semibold text-[#b15f48]"
                  >
                    忘記密碼？
                  </Button>
                ) : null}
              </div>
            </form>

            <FieldSeparator className="mt-6">其他登入方式</FieldSeparator>

            <div className="grid gap-3">
              {(["google", "apple"] as const).map((provider) => (
                <form key={provider} action={signInWithOAuthAction}>
                  <input name="provider" type="hidden" value={provider} />
                  <input name="next" type="hidden" value={next} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full justify-center rounded-none border-x-0 border-t-0 border-b-[#d9c6b8] bg-transparent px-0 text-sm text-[#5a3728] hover:bg-transparent hover:text-[#5a3728]"
                  >
                    使用 {provider === "google" ? "Google" : "Apple"} 登入
                  </Button>
                </form>
              ))}
            </div>

            <Separator className="my-6 bg-[#e8d8c9]" />

            <div className="flex items-start justify-between gap-4 text-sm text-[#8a6b57]">
              <p className="max-w-[14rem] leading-6">
                已有邀請連結或邀請碼？
              </p>
              <Link
                href="/onboarding/join"
                className="font-semibold text-[#b15f48] transition-colors hover:text-[#9d5233]"
              >
                使用邀請碼
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
