import {
  getCurrentHousehold,
  type CurrentHouseholdMembership,
} from "@/lib/household/current-household";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type PaymentAccount = Pick<Database["public"]["Tables"]["payment_accounts"]["Row"], "id">;

export type OnboardingRoute =
  | "/login"
  | "/onboarding/create"
  | "/onboarding/join"
  | "/onboarding/join/success"
  | "/onboarding/accounts"
  | "/dashboard";

type OnboardingRouteOptions = {
  joined?: boolean;
};

type OnboardingRouteAccess = {
  allowedRoutes: OnboardingRoute[];
  defaultRoute: OnboardingRoute;
};

export type OnboardingState = {
  user: Awaited<ReturnType<typeof getCurrentHousehold>>["user"];
  householdMembership: CurrentHouseholdMembership | null;
  hasCompletedAccountSetup: boolean;
  hasPaymentAccounts: boolean;
};

export async function getOnboardingState(): Promise<OnboardingState> {
  const currentHousehold = await getCurrentHousehold();

  if (!currentHousehold.user) {
    return {
      user: null,
      householdMembership: null,
      hasCompletedAccountSetup: false,
      hasPaymentAccounts: false,
    };
  }

  const supabase = await getSupabaseServerClient();

  const { data: paymentAccounts } = currentHousehold.householdId
    ? await supabase
        .from("payment_accounts")
        .select("id")
        .eq("household_id", currentHousehold.householdId)
        .eq("user_id", currentHousehold.user.id)
        .eq("is_archived", false)
        .returns<PaymentAccount[]>()
    : { data: [] as PaymentAccount[] };

  const metadataFlag = Boolean(
    currentHousehold.user.user_metadata?.onboarding?.accountSetupComplete ??
      currentHousehold.user.user_metadata?.account_setup_complete,
  );
  const hasPaymentAccounts = (paymentAccounts?.length ?? 0) > 0;

  return {
    user: currentHousehold.user,
    householdMembership: currentHousehold.householdMembership,
    hasCompletedAccountSetup: metadataFlag || hasPaymentAccounts,
    hasPaymentAccounts,
  };
}

export function getAllowedOnboardingRoutes(
  state: OnboardingState,
  options: OnboardingRouteOptions = {},
): OnboardingRouteAccess {
  if (!state.user) {
    return {
      allowedRoutes: ["/login"],
      defaultRoute: "/login",
    };
  }

  if (!state.householdMembership) {
    return {
      allowedRoutes: ["/onboarding/create", "/onboarding/join"],
      defaultRoute: "/onboarding/create",
    };
  }

  if (!state.hasCompletedAccountSetup) {
    return {
      allowedRoutes: options.joined
        ? ["/onboarding/join/success", "/onboarding/accounts"]
        : ["/onboarding/accounts"],
      defaultRoute: "/onboarding/accounts",
    };
  }

  return {
    allowedRoutes: ["/dashboard"],
    defaultRoute: "/dashboard",
  };
}

export function getNextOnboardingRoute(
  state: OnboardingState,
  options: OnboardingRouteOptions = {},
) {
  return getAllowedOnboardingRoutes(state, options).defaultRoute;
}

export function isAllowedOnboardingRoute(
  state: OnboardingState,
  route: OnboardingRoute,
  options: OnboardingRouteOptions = {},
) {
  const { allowedRoutes } = getAllowedOnboardingRoutes(state, options);

  return allowedRoutes.includes(route);
}
