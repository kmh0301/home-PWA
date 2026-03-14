import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { buildLoginRedirectPath, getCurrentSessionState } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getNextOnboardingRoute, getOnboardingState } from "@/lib/onboarding/state";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  if (!isSupabaseConfigured) {
    return <AppShell>{children}</AppShell>;
  }

  const { hasSession } = await getCurrentSessionState();

  if (!hasSession) {
    redirect(buildLoginRedirectPath("/dashboard"));
  }

  const onboardingState = await getOnboardingState();
  const nextRoute = getNextOnboardingRoute(onboardingState);

  if (nextRoute !== "/dashboard") {
    redirect(nextRoute);
  }

  return <AppShell>{children}</AppShell>;
}
