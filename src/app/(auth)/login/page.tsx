import Link from "next/link";

import {
  resetPasswordAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/(auth)/login/actions";

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
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-[32px] border border-[var(--color-border)] bg-white px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          {mode === "register" ? "Create account" : "Welcome back"}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[var(--color-foreground)]">
          一齊經營一個家
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
          {mode === "register"
            ? "Create your account first, then continue into household setup."
            : "Sign in to continue into your household onboarding or protected app."}
        </p>
        {params.error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
            {params.error}
          </div>
        ) : null}
        {params.message ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
            {params.message}
          </div>
        ) : null}

        <div className="mt-6 flex rounded-full bg-[var(--color-panel)] p-1">
          <Link
            href={`/login?mode=login${next ? `&next=${encodeURIComponent(next)}` : ""}`}
            className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold ${
              mode === "login"
                ? "bg-white text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)]"
            }`}
          >
            Login
          </Link>
          <Link
            href={`/login?mode=register${next ? `&next=${encodeURIComponent(next)}` : ""}`}
            className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold ${
              mode === "register"
                ? "bg-white text-[var(--color-foreground)] shadow-sm"
                : "text-[var(--color-muted)]"
            }`}
          >
            Register
          </Link>
        </div>

        <form
          action={mode === "register" ? signUpAction : signInAction}
          className="mt-6 space-y-4"
        >
          <input name="next" type="hidden" value={next} />

          {mode === "register" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Display name
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                name="displayName"
                placeholder="Alex"
                required
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
              Email
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="email"
              type="email"
              placeholder="alex@example.com"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
              Password
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </label>

          {mode === "register" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--color-foreground)]">
                Confirm password
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-[var(--color-border)] px-4 outline-none transition focus:border-[var(--color-accent)]"
                name="passwordConfirm"
                type="password"
                placeholder="••••••••"
                required
              />
            </label>
          ) : null}

          <button
            type="submit"
            className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--color-accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {mode === "register" ? "Create account" : "Sign in"}
          </button>

          {mode === "login" ? (
            <button
              type="submit"
              formAction={resetPasswordAction}
              className="text-sm font-semibold text-[var(--color-accent)]"
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        <div className="mt-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">
          <span className="h-px flex-1 bg-[var(--color-border)]" />
          <span>OAuth</span>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>

        <div className="mt-4 grid gap-3">
          {(["google", "apple"] as const).map((provider) => (
            <form key={provider} action={signInWithOAuthAction}>
              <input name="provider" type="hidden" value={provider} />
              <input name="next" type="hidden" value={next} />
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center rounded-full border border-[var(--color-border)] px-5 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-panel)]"
              >
                Continue with {provider === "google" ? "Google" : "Apple"}
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
