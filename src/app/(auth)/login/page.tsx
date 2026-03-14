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
  const title = mode === "register" ? "Create your account" : "Sign in to continue";
  const description =
    mode === "register"
      ? "Set up your secure account first. The app will route you into the right next step after verification."
      : "Use your email and password to return to your shared household workspace.";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8 sm:py-10">
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Home PWA
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
                Login
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
                Register
              </Link>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              <span>Secure session and protected household routing</span>
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
                        autoComplete="nickname"
                        autoCapitalize="words"
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
                      autoCapitalize="none"
                      autoComplete="email"
                      id="email"
                      name="email"
                      spellCheck={false}
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
                      <FieldLabel htmlFor="passwordConfirm">Confirm password</FieldLabel>
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

            <FieldSeparator>other options</FieldSeparator>

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

            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <p>Need access to a shared home?</p>
              <Link
                href="/onboarding/join"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Use invite code
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
