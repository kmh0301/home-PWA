import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { buildLoginRedirectPath, getCurrentSessionState } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getNextOnboardingRoute, getOnboardingState } from "@/lib/onboarding/state";

type OnboardingLayoutProps = {
  children: ReactNode;
};

export default async function OnboardingLayout({ children }: OnboardingLayoutProps) {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        {children}
      </main>
    );
  }

  const { hasSession } = await getCurrentSessionState();

  if (!hasSession) {
    redirect(buildLoginRedirectPath("/onboarding/create"));
  }

  const state = await getOnboardingState();

  if (!state.user) {
    redirect(buildLoginRedirectPath("/onboarding/create"));
  }

  const nextRoute = getNextOnboardingRoute(state);
  const pathname = state.householdMembership
    ? state.hasCompletedAccountSetup
      ? "/dashboard"
      : "/onboarding/accounts"
    : "/onboarding/create";

  if (nextRoute !== pathname && nextRoute !== "/login") {
    redirect(nextRoute);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      {children}
    </main>
  );
}
