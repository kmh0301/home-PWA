import {
  resetPasswordAction,
  signInAction,
  signInWithOAuthAction,
  signUpAction,
} from "@/app/(auth)/login/actions"
import { AnimatedCharactersLoginPage } from "@/components/ui/animated-characters-login-page"

type LoginPageProps = {
  searchParams?: Promise<{
    mode?: string
    error?: string
    message?: string
    next?: string
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {}
  const mode = params.mode === "register" ? "register" : "login"

  return (
    <AnimatedCharactersLoginPage
      mode={mode}
      next={params.next ?? "/"}
      error={params.error ?? null}
      message={params.message ?? null}
      submitAction={mode === "register" ? signUpAction : signInAction}
      googleAction={signInWithOAuthAction}
      resetPasswordAction={resetPasswordAction}
    />
  )
}
