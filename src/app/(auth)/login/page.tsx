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
  CardDescription,
  CardHeader,
  CardTitle,
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <section className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            家庭協作帳本
          </p>
          <div className="flex flex-col gap-2">
            <h1 className="max-w-md text-4xl font-semibold tracking-tight text-foreground">
              {mode === "register" ? "建立安全入口，開始設定你的 household" : "安全登入，回到你們的共享空間"}
            </h1>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              {mode === "register"
                ? "完成註冊後，你可以繼續建立 household、邀請伴侶，並開始共享帳本。"
                : "登入後，系統會把你帶回屬於自己 household 狀態的正確入口。"}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-[0_1px_4px_rgba(28,25,23,0.04)]">
            <ShieldCheck className="size-4 text-primary" />
            受保護 session 與 household-aware routing
          </div>
        </div>

        <Card className="overflow-hidden rounded-[28px] border-border bg-card shadow-[0_20px_60px_rgba(28,25,23,0.08)]">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-primary to-secondary/70" />
          <CardHeader className="flex flex-col gap-3 p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <CardTitle className="text-2xl text-card-foreground">
                {mode === "register" ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-sm leading-6 text-muted-foreground">
                {mode === "register"
                  ? "用同一個入口完成註冊、驗證電郵，然後繼續 household setup。"
                  : "用 email、password 或 OAuth 方式登入，之後系統會自動判斷下一步。"}
              </CardDescription>
            </div>

            <div className="grid grid-cols-2 rounded-2xl border border-border/80 bg-muted/70 p-1">
              <Link
                href={`/login?mode=login${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  mode === "login"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(28,25,23,0.05)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Login
              </Link>
              <Link
                href={`/login?mode=register${next ? `&next=${encodeURIComponent(next)}` : ""}`}
                className={cn(
                  "rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors",
                  mode === "register"
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgba(28,25,23,0.05)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Register
              </Link>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-6 p-6 pt-0 sm:p-8 sm:pt-0">
            {statusTone ? (
              <Alert
                className={cn(
                  "rounded-2xl border px-4 py-4",
                  statusTone === "error"
                    ? "border-destructive/20 bg-destructive/5 text-destructive"
                    : "border-[color:var(--positive)]/20 bg-[color:var(--positive)]/5 text-[color:var(--positive)]",
                )}
              >
                <AlertTitle className="text-sm font-semibold">
                  {statusTone === "error" ? "Action needed" : "Check your inbox"}
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
                      <FieldLabel htmlFor="displayName">Display name</FieldLabel>
                      <Input
                        id="displayName"
                        name="displayName"
                        placeholder="Alex"
                        required
                        className="h-12 rounded-2xl border-input bg-background px-4"
                      />
                      <FieldDescription>
                        這個名稱會顯示在 household 邀請和共享紀錄中。
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                ) : null}

                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="email">Email</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="alex@example.com"
                      required
                      className="h-12 rounded-2xl border-input bg-background px-4"
                    />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldContent>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
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
                      <FieldLabel htmlFor="passwordConfirm">Confirm password</FieldLabel>
                      <Input
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
                  {mode === "register" ? "Create account" : "Sign in"}
                  <ArrowRight data-icon="inline-end" />
                </Button>

                {mode === "login" ? (
                  <Button
                    type="submit"
                    formAction={resetPasswordAction}
                    variant="link"
                    className="h-auto justify-start px-0 text-sm text-primary"
                  >
                    Forgot password?
                  </Button>
                ) : null}
              </div>
            </form>

            <FieldSeparator>alternative sign in</FieldSeparator>

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
                    Sign in with {provider === "google" ? "Google" : "Apple"}
                  </Button>
                </form>
              ))}
            </div>

            <Separator />

            <p className="text-sm leading-6 text-muted-foreground">
              你的 session 只會帶你進入屬於自己 household 的流程與資料範圍。
            </p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
