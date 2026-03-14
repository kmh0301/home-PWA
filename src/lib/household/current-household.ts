import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CurrentHouseholdMembership = Pick<
  Database["public"]["Tables"]["household_members"]["Row"],
  "id" | "household_id" | "user_id" | "display_name"
>;

export type CurrentHouseholdContext = {
  householdId: string | null;
  householdMembership: CurrentHouseholdMembership | null;
  user: User | null;
};

type RequireCurrentHouseholdOptions = {
  redirectTo?: string;
};

export async function getCurrentHousehold(): Promise<CurrentHouseholdContext> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      householdMembership: null,
      householdId: null,
    };
  }

  const { data: householdMembership } = await supabase
    .from("household_members")
    .select("id, household_id, user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle<CurrentHouseholdMembership>();

  return {
    user,
    householdMembership: householdMembership ?? null,
    householdId: householdMembership?.household_id ?? null,
  };
}

export async function requireCurrentHousehold(
  options: RequireCurrentHouseholdOptions = {},
) {
  const currentHousehold = await getCurrentHousehold();

  if (!currentHousehold.user) {
    redirect("/login");
  }

  if (!currentHousehold.householdMembership || !currentHousehold.householdId) {
    redirect(options.redirectTo ?? "/onboarding/create");
  }

  return {
    user: currentHousehold.user,
    householdId: currentHousehold.householdId,
    householdMembership: currentHousehold.householdMembership,
  };
}
