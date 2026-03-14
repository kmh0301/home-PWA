import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

import {
  resetPasswordAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/(auth)/login/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
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
  const title = mode === "register" ? "建立帳戶" : "登入後繼續";
  const description =
    mode === "register"
      ? "先完成註冊和電郵驗證，之後就可以加入你的家庭空間。"
      : "使用你的電郵和密碼，返回你們的共享家庭空間。";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:py-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            家庭協作帳本
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-border bg-card shadow-[0_18px_48px_rgba(28,25,23,0.08)]">
          <div className="h-1 w-full bg-primary" />
          <CardHeader className="flex flex-col gap-4 p-6 sm:p-8">
            <div className="grid grid-cols-2 rounded-2xl border border-border bg-muted/60 p-1">
              <Link
                href={`/login?mode=login${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  mode === "login" ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                登入
              </Link>
              <Link
                href={`/login?mode=register${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  mode === "register"
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                註冊
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <span>安全登入狀態與受保護的家庭空間</span>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 p-6 pt-0 sm:p-8 sm:pt-0">
            {statusTone ? (
              <Alert
                aria-live="polite"
                className={cn(
                  "rounded-2xl border px-4 py-4",
                  statusTone === "error"
                    ? "border-destructive/20 bg-destructive/5 text-destructive"
                    : "border-[color:var(--positive)]/20 bg-[color:var(--positive)]/5 text-[color:var(--positive)]",
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
              className="flex flex-col gap-6"
            >
              <input name="next" type="hidden" value={next} />

              <FieldGroup className="gap-5">
                {mode === "register" ? (
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="displayName">顯示名稱</FieldLabel>
                      <Input
                        autoComplete="nickname"
                        autoCapitalize="words"
                        id="displayName"
                        name="displayName"
                        placeholder="例如：阿晴"
                        required
                        className="h-12 rounded-2xl border-input bg-background px-4"
                      />
                      <FieldDescription>
                        這個名稱會顯示在家庭邀請和共享紀錄中。
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                ) : null}

                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="email">電郵</FieldLabel>
                    <Input
                      autoCapitalize="none"
                      autoComplete="email"
                      id="email"
                      name="email"
                      spellCheck={false}
                      type="email"
                      placeholder="name@example.com"
                      required
                      className="h-12 rounded-2xl border-input bg-background px-4"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="password">密碼</FieldLabel>
                    <Input
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="h-12 rounded-2xl border-input bg-background px-4"
                    />
                  </FieldContent>
                </Field>

                {mode === "register" ? (
                  <Field>
                    <FieldContent>
                      <FieldLabel htmlFor="passwordConfirm">確認密碼</FieldLabel>
                      <Input
                        autoComplete="new-password"
                        id="passwordConfirm"
                        name="passwordConfirm"
                        type="password"
                        placeholder="••••••••"
                        required
                        className="h-12 rounded-2xl border-input bg-background px-4"
                      />
                    </FieldContent>
                  </Field>
                ) : null}
              </FieldGroup>

              <div className="flex flex-col gap-3">
                <Button type="submit" size="lg" className="h-12 rounded-full text-sm font-semibold">
                  {mode === "register" ? "建立帳戶" : "登入"}
                  <ArrowRight data-icon="inline-end" />
                </Button>

                {mode === "login" ? (
                  <Button
                    type="submit"
                    formAction={resetPasswordAction}
                    variant="link"
                    className="h-auto justify-start px-0 text-sm text-primary"
                  >
                    忘記密碼？
                  </Button>
                ) : null}
              </div>
            </form>

            <FieldSeparator>其他登入方式</FieldSeparator>

            <div className="grid gap-2.5">
              {(["google", "apple"] as const).map((provider) => (
                <form key={provider} action={signInWithOAuthAction}>
                  <input name="provider" type="hidden" value={provider} />
                  <input name="next" type="hidden" value={next} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full justify-center rounded-full border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    使用 {provider === "google" ? "Google" : "Apple"} 登入
                  </Button>
                </form>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>已有共享家庭邀請碼？</p>
              <Link
                href="/onboarding/join"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                使用邀請碼
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
