import {
  getCurrentHousehold,
  type CurrentHouseholdMembership,
} from "@/lib/household/current-household";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type PaymentAccount = Pick<Database["public"]["Tables"]["payment_accounts"]["Row"], "id">;

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

export function getNextOnboardingRoute(state: OnboardingState) {
  if (!state.user) {
    return "/login";
  }

  if (!state.householdMembership) {
    return "/onboarding/create";
  }

  if (!state.hasCompletedAccountSetup) {
    return "/onboarding/accounts";
  }

  return "/dashboard";
}
