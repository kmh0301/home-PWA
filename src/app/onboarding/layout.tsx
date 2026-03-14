import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { buildLoginRedirectPath, getCurrentSessionState } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import {
  getNextOnboardingRoute,
  getOnboardingState,
  isAllowedOnboardingRoute,
} from "@/lib/onboarding/state";
import { getRequestedOnboardingRouteFromHeaders } from "@/lib/onboarding/request-route";

type OnboardingLayoutProps = {
  children: ReactNode;
};

async function getRequestedOnboardingRoute() {
  const headerStore = await headers();

  return getRequestedOnboardingRouteFromHeaders(headerStore);
}

export default async function OnboardingLayout({ children }: OnboardingLayoutProps) {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        {children}
      </main>
    );
  }

  const requestedRoute = await getRequestedOnboardingRoute();
  const { hasSession } = await getCurrentSessionState();

  if (!hasSession) {
    redirect(buildLoginRedirectPath(requestedRoute.pathname ?? "/onboarding/create"));
  }

  const state = await getOnboardingState();

  if (!state.user) {
    redirect(buildLoginRedirectPath(requestedRoute.pathname ?? "/onboarding/create"));
  }

  const nextRoute = getNextOnboardingRoute(state, { joined: requestedRoute.joined });

  if (
    requestedRoute.pathname &&
    !isAllowedOnboardingRoute(state, requestedRoute.pathname, { joined: requestedRoute.joined })
  ) {
    redirect(nextRoute);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
      {children}
    </main>
  );
}
