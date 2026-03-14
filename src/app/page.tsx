import { redirect } from "next/navigation";

import { getCurrentSessionState } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { getNextOnboardingRoute, getOnboardingState } from "@/lib/onboarding/state";

export default async function HomePage() {
  if (!isSupabaseConfigured) {
    redirect("/login");
  }

  const { hasSession } = await getCurrentSessionState();

  if (!hasSession) {
    redirect("/login");
  }

  const onboardingState = await getOnboardingState();
  redirect(getNextOnboardingRoute(onboardingState));
}
