"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { env } from "@/lib/env";
import { requireCurrentHousehold } from "@/lib/household/current-household";
import { getOnboardingState, type OnboardingState } from "@/lib/onboarding/state";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

const DEFAULT_INVITE_EXPIRY_HOURS = 24;

type PaymentAccountType = "alipay_hk" | "payme" | "cash" | "credit_card" | "custom";

type CreateHouseholdResult = Database["public"]["Functions"]["create_household"]["Returns"][number];
type InvitePreview = Database["public"]["Functions"]["validate_invite_code"]["Returns"][number];
type ClaimInviteResult = Database["public"]["Functions"]["claim_invite"]["Returns"][number];
type RegenerateInviteResult =
  Database["public"]["Functions"]["regenerate_household_invite"]["Returns"][number];

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

async function getAppOrigin() {
  const headerStore = await headers();

  return env.NEXT_PUBLIC_APP_URL || headerStore.get("origin") || "http://localhost:3000";
}

function getCreateHouseholdErrorMessage(status: CreateHouseholdResult["status"] | null | undefined) {
  switch (status) {
    case "invalid_household_name":
      return "請先輸入家庭名稱。";
    case "already_in_household":
      return "你已經加入家庭，不能再次建立新家庭。";
    case "invite_generation_failed":
      return "暫時未能建立邀請碼，請稍後再試。";
    case "not_authenticated":
      return "請先登入，再建立家庭。";
    case "invalid_invite_expiry":
      return "邀請碼有效期設定無效，請稍後再試。";
    default:
      return "暫時未能建立家庭，請稍後再試。";
  }
}

function getInvitePreviewErrorMessage(status: InvitePreview["status"] | null | undefined) {
  switch (status) {
    case "invalid_invite":
      return "邀請碼無效，請檢查後再試。";
    case "invite_expired":
      return "邀請碼已過期，請向對方索取新的邀請碼。";
    case "invite_used":
      return "這個邀請碼已被使用，請向對方索取新的邀請碼。";
    case "already_in_household":
      return "你已經加入家庭，不能使用這個邀請碼。";
    case "household_full":
      return "這個家庭已滿兩位成員，暫時不能加入。";
    default:
      return "暫時未能驗證邀請碼，請稍後再試。";
  }
}

function getClaimInviteErrorMessage(status: ClaimInviteResult["status"] | null | undefined) {
  switch (status) {
    case "invalid_display_name":
      return "請輸入你想顯示給夥伴看的名稱。";
    case "invalid_invite":
      return "邀請碼無效，請重新輸入。";
    case "invite_expired":
      return "邀請碼已過期，請向對方索取新的邀請碼。";
    case "invite_used":
      return "這個邀請碼已被使用，請向對方索取新的邀請碼。";
    case "already_in_household":
      return "你已經加入家庭，不能再次加入。";
    case "household_full":
      return "這個家庭已滿兩位成員，暫時不能加入。";
    case "not_authenticated":
      return "請先登入，再加入家庭。";
    default:
      return "暫時未能加入家庭，請稍後再試。";
  }
}

function getRegenerateInviteErrorMessage(
  status: RegenerateInviteResult["status"] | null | undefined,
) {
  switch (status) {
    case "not_owner":
      return "只有建立家庭的一方可以重新產生邀請碼。";
    case "household_full":
      return "家庭已滿兩位成員，暫時不需要新的邀請碼。";
    case "household_not_found":
      return "找不到你的家庭資料，請重新整理後再試。";
    case "invalid_invite_expiry":
      return "邀請碼有效期設定無效，請稍後再試。";
    case "invite_generation_failed":
      return "暫時未能重新產生邀請碼，請稍後再試。";
    case "not_authenticated":
      return "請先登入，再重新產生邀請碼。";
    default:
      return "暫時未能重新產生邀請碼，請稍後再試。";
  }
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
    redirect(`/onboarding/create?error=${encodeMessage("請先輸入家庭名稱。")}`);
  }

  const supabase = await getSupabaseServerClient();
  const displayName =
    String(onboardingState.user.user_metadata?.display_name ?? "").trim() ||
    onboardingState.user.email?.split("@")[0] ||
    "Member";

  const { data, error } = await supabase.rpc("create_household", {
    p_household_name: householdName,
    p_display_name: displayName,
    p_invite_expiry_hours: DEFAULT_INVITE_EXPIRY_HOURS,
  });

  const result = (data?.[0] ?? null) as CreateHouseholdResult | null;

  if (error || !result || result.status !== "success") {
    redirect(
      `/onboarding/create?error=${encodeMessage(
        getCreateHouseholdErrorMessage(result?.status),
      )}`,
    );
  }

  if (!result.household_name || !result.invite_code || !result.expires_at) {
    redirect(`/onboarding/create?error=${encodeMessage("暫時未能建立家庭，請稍後再試。")}`);
  }

  revalidatePath("/");
  revalidatePath("/onboarding/create");
  redirect(
    `/onboarding/create?success=1&householdName=${encodeMessage(
      result.household_name,
    )}&inviteCode=${result.invite_code}&expiresAt=${encodeURIComponent(result.expires_at)}`,
  );
}

export async function validateInviteAction(formData: FormData) {
  await requireAuthedOnboardingState();
  const inviteCode = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();

  if (inviteCode.length !== 6) {
    redirect(`/onboarding/join?error=${encodeMessage("邀請碼必須是 6 個字元。")}`);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("validate_invite_code", {
    p_code: inviteCode,
  });

  const preview = (data?.[0] ?? null) as InvitePreview | null;

  if (error || !preview || !preview.is_valid) {
    redirect(
      `/onboarding/join?error=${encodeMessage(
        getInvitePreviewErrorMessage(preview?.status),
      )}&inviteCode=${inviteCode}`,
    );
  }

  if (!preview.household_name || !preview.expires_at || !preview.creator_display_name) {
    redirect(`/onboarding/join?error=${encodeMessage("暫時未能驗證邀請碼，請稍後再試。")}`);
  }

  redirect(
    `/onboarding/join?inviteCode=${inviteCode}&householdName=${encodeMessage(
      preview.household_name,
    )}&expiresAt=${encodeURIComponent(preview.expires_at)}&creatorDisplayName=${encodeMessage(
      preview.creator_display_name,
    )}&memberCount=${preview.member_count}&valid=1`,
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
  const { data, error } = await supabase.rpc("claim_invite", {
    p_code: inviteCode,
    p_display_name: displayName,
  });

  const result = (data?.[0] ?? null) as ClaimInviteResult | null;

  if (error || !result || result.status !== "success") {
    redirect(
      `/onboarding/join?error=${encodeMessage(
        getClaimInviteErrorMessage(result?.status),
      )}&inviteCode=${inviteCode}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/onboarding/join");
  redirect("/onboarding/accounts?joined=1");
}

export async function regenerateInviteAction() {
  const currentHousehold = await requireTrustedCurrentHousehold();
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.rpc("regenerate_household_invite", {
    p_household_id: currentHousehold.householdId,
    p_invite_expiry_hours: DEFAULT_INVITE_EXPIRY_HOURS,
  });

  const result = (data?.[0] ?? null) as RegenerateInviteResult | null;

  if (error || !result || (result.status !== "success" && result.status !== "active_invite_exists")) {
    redirect(
      `/onboarding/create?error=${encodeMessage(
        getRegenerateInviteErrorMessage(result?.status),
      )}`,
    );
  }

  if (!result.household_name || !result.invite_code || !result.expires_at) {
    redirect(`/onboarding/create?error=${encodeMessage("暫時未能重新產生邀請碼，請稍後再試。")}`);
  }

  revalidatePath("/");
  revalidatePath("/onboarding/create");
  redirect(
    `/onboarding/create?success=1&householdName=${encodeMessage(
      result.household_name,
    )}&inviteCode=${result.invite_code}&expiresAt=${encodeURIComponent(result.expires_at)}`,
  );
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
