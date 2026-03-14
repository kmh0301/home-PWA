"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { requireCurrentHousehold } from "@/lib/household/current-household";
import { getOnboardingState, type OnboardingState } from "@/lib/onboarding/state";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_INVITE_EXPIRY_HOURS = 24;

type PaymentAccountType = "alipay_hk" | "payme" | "cash" | "credit_card" | "custom";

type InvitePreview = {
  household_id: string;
  household_name: string;
  expires_at: string;
  is_valid: boolean;
};

type AccountPresetInput = {
  key: string;
  label: string;
  type: PaymentAccountType;
};

const accountPresets: AccountPresetInput[] = [
  { key: "alipay_hk", label: "Alipay HK", type: "alipay_hk" },
  { key: "payme", label: "PayMe", type: "payme" },
  { key: "cash", label: "Cash", type: "cash" },
  { key: "credit_card", label: "Credit Card", type: "credit_card" },
];

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function parseCurrencyToCents(input: FormDataEntryValue | null) {
  const raw = String(input ?? "").trim();

  if (!raw) {
    return 0;
  }

  const normalized = Number(raw.replace(/,/g, ""));

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error("Amount must be a non-negative number");
  }

  return Math.round(normalized * 100);
}

function generateInviteCode() {
  return randomBytes(4)
    .toString("base64url")
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 6);
}

async function getAppOrigin() {
  const headerStore = await headers();

  return env.NEXT_PUBLIC_APP_URL || headerStore.get("origin") || "http://localhost:3000";
}

async function requireAuthedOnboardingState(): Promise<
  OnboardingState & {
    user: NonNullable<OnboardingState["user"]>;
  }
> {
  const onboardingState = await getOnboardingState();

  if (!onboardingState.user) {
    redirect("/login");
  }

  return {
    ...onboardingState,
    user: onboardingState.user,
  };
}

async function requireTrustedCurrentHousehold() {
  const currentHousehold = await requireCurrentHousehold({
    redirectTo: "/onboarding/create",
  });

  return currentHousehold;
}

export async function createHouseholdAction(formData: FormData) {
  const onboardingState = await requireAuthedOnboardingState();
  const householdName = String(formData.get("householdName") ?? "").trim();

  if (!householdName) {
    redirect("/onboarding/create?error=Household%20name%20is%20required");
  }

  const supabase = await getSupabaseServerClient();
  const displayName =
    String(onboardingState.user.user_metadata?.display_name ?? "").trim() ||
    onboardingState.user.email?.split("@")[0] ||
    "Member";

  const { data: household, error: householdError } = await supabase
    .from("households")
    .insert({
      name: householdName,
    })
    .select("id, name")
    .single();

  if (householdError || !household) {
    redirect(
      `/onboarding/create?error=${encodeMessage(
        householdError?.message ?? "Failed to create household",
      )}`,
    );
  }

  const { error: membershipError } = await supabase.from("household_members").insert({
    household_id: household.id,
    user_id: onboardingState.user.id,
    display_name: displayName,
  });

  if (membershipError) {
    redirect(`/onboarding/create?error=${encodeMessage(membershipError.message)}`);
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date(Date.now() + DEFAULT_INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  const { error: inviteError } = await supabase.from("household_invites").insert({
    household_id: household.id,
    code: inviteCode,
    created_by: onboardingState.user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (inviteError) {
    redirect(`/onboarding/create?error=${encodeMessage(inviteError.message)}`);
  }

  revalidatePath("/");
  revalidatePath("/onboarding/create");
  redirect(
    `/onboarding/create?success=1&householdName=${encodeMessage(
      household.name,
    )}&inviteCode=${inviteCode}&expiresAt=${encodeURIComponent(expiresAt.toISOString())}`,
  );
}

export async function validateInviteAction(formData: FormData) {
  await requireAuthedOnboardingState();
  const inviteCode = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();

  if (inviteCode.length !== 6) {
    redirect("/onboarding/join?error=Invite%20code%20must%20be%206%20characters");
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("validate_invite_code", {
    p_code: inviteCode,
  });

  const preview = (data?.[0] ?? null) as InvitePreview | null;

  if (error || !preview || !preview.is_valid) {
    redirect(
      `/onboarding/join?error=${encodeMessage(
        error?.message || "Invite code is invalid or expired",
      )}&inviteCode=${inviteCode}`,
    );
  }

  redirect(
    `/onboarding/join?inviteCode=${inviteCode}&householdName=${encodeMessage(
      preview.household_name,
    )}&expiresAt=${encodeURIComponent(preview.expires_at)}&valid=1`,
  );
}

export async function claimInviteAction(formData: FormData) {
  const onboardingState = await requireAuthedOnboardingState();
  const inviteCode = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  const displayName =
    String(formData.get("displayName") ?? "").trim() ||
    String(onboardingState.user.user_metadata?.display_name ?? "").trim() ||
    onboardingState.user.email?.split("@")[0] ||
    "Member";

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("claim_invite", {
    p_code: inviteCode,
    p_display_name: displayName,
  });

  if (error) {
    redirect(`/onboarding/join?error=${encodeMessage(error.message)}&inviteCode=${inviteCode}`);
  }

  revalidatePath("/");
  revalidatePath("/onboarding/join");
  redirect("/onboarding/accounts?joined=1");
}

export async function completeAccountSetupAction(formData: FormData) {
  const currentHousehold = await requireTrustedCurrentHousehold();
  const householdId = currentHousehold.householdId;
  const supabase = await getSupabaseServerClient();
  const accountsToCreate = accountPresets
    .map((preset) => ({
      ...preset,
      enabled: formData.get(`enabled:${preset.key}`) === "on",
      name: String(formData.get(`name:${preset.key}`) ?? preset.label).trim() || preset.label,
      initialBalanceCents: parseCurrencyToCents(formData.get(`balance:${preset.key}`)),
      creditLimitCents: parseCurrencyToCents(formData.get(`limit:${preset.key}`)),
      creditUsedCents: parseCurrencyToCents(formData.get(`used:${preset.key}`)),
    }))
    .filter((account) => account.enabled);

  const customName = String(formData.get("custom:name") ?? "").trim();
  const customType = String(formData.get("custom:type") ?? "custom") as PaymentAccountType;
  const customEnabled = formData.get("custom:enabled") === "on" && customName.length > 0;

  if (customEnabled) {
    accountsToCreate.push({
      key: "custom",
      label: customName,
      type: customType,
      enabled: true,
      name: customName,
      initialBalanceCents: parseCurrencyToCents(formData.get("custom:balance")),
      creditLimitCents: parseCurrencyToCents(formData.get("custom:limit")),
      creditUsedCents: parseCurrencyToCents(formData.get("custom:used")),
    });
  }

  for (const account of accountsToCreate) {
    const isCreditCard = account.type === "credit_card";
    const { data: createdAccount, error: createError } = await supabase
      .from("payment_accounts")
      .insert({
        household_id: householdId,
        user_id: currentHousehold.user.id,
        name: account.name,
        type: account.type,
        balance_cents: 0,
        credit_limit_cents: isCreditCard ? account.creditLimitCents : null,
        credit_used_cents: isCreditCard ? 0 : null,
      })
      .select("id")
      .single();

    if (createError || !createdAccount) {
      redirect(`/onboarding/accounts?error=${encodeMessage(createError?.message ?? "Failed to create account")}`);
    }

    if (!isCreditCard && account.initialBalanceCents > 0) {
      const { error } = await supabase.rpc("record_manual_adjustment", {
        p_household_id: householdId,
        p_account_id: createdAccount.id,
        p_new_balance_cents: account.initialBalanceCents,
        p_note: "Initial setup",
      });

      if (error) {
        redirect(`/onboarding/accounts?error=${encodeMessage(error.message)}`);
      }
    }

    if (isCreditCard && account.creditUsedCents > 0) {
      const { error } = await supabase.rpc("set_credit_card_used_balance", {
        p_household_id: householdId,
        p_account_id: createdAccount.id,
        p_credit_used_cents: account.creditUsedCents,
        p_note: "Initial setup",
      });

      if (error) {
        redirect(`/onboarding/accounts?error=${encodeMessage(error.message)}`);
      }
    }
  }

  const origin = await getAppOrigin();
  await supabase.auth.updateUser({
    data: {
      onboarding: {
        accountSetupComplete: true,
        completedAt: new Date().toISOString(),
        origin,
      },
      account_setup_complete: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function skipAccountSetupAction() {
  await requireTrustedCurrentHousehold();

  const supabase = await getSupabaseServerClient();

  await supabase.auth.updateUser({
    data: {
      onboarding: {
        accountSetupComplete: true,
        skipped: true,
        completedAt: new Date().toISOString(),
      },
      account_setup_complete: true,
    },
  });

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
