"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEFAULT_AUTHENTICATED_ENTRY_PATH,
  getSafeRedirectTarget,
} from "@/lib/auth/session";
import { logAuthDebug } from "@/lib/auth/debug";
import { env } from "@/lib/env";
import { getSupabaseServerActionClient } from "@/lib/supabase/server-action";

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

async function getOrigin() {
  const headerStore = await headers();

  return (
    env.NEXT_PUBLIC_APP_URL ||
    headerStore.get("origin") ||
    "http://localhost:3000"
  );
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = getSafeRedirectTarget(
    String(formData.get("next") ?? DEFAULT_AUTHENTICATED_ENTRY_PATH),
    DEFAULT_AUTHENTICATED_ENTRY_PATH,
  );
  const supabase = await getSupabaseServerActionClient();
  logAuthDebug("sign_in.start", {
    next,
  });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  logAuthDebug("sign_in.result", {
    next,
    error: error?.message ?? null,
  });

  if (error) {
    redirect(`/login?error=${encodeMessage(error.message)}&next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}

export async function signUpAction(formData: FormData) {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
  const next = getSafeRedirectTarget(
    String(formData.get("next") ?? DEFAULT_AUTHENTICATED_ENTRY_PATH),
    DEFAULT_AUTHENTICATED_ENTRY_PATH,
  );

  if (!displayName) {
    redirect(
      `/login?mode=register&error=Display%20name%20is%20required&next=${encodeURIComponent(next)}`,
    );
  }

  if (password !== passwordConfirm) {
    redirect(
      `/login?mode=register&error=Passwords%20do%20not%20match&next=${encodeURIComponent(next)}`,
    );
  }

  const supabase = await getSupabaseServerActionClient();
  const origin = await getOrigin();
  logAuthDebug("sign_up.start", {
    next,
  });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    logAuthDebug("sign_up.result", {
      next,
      error: error.message,
    });
    redirect(
      `/login?mode=register&error=${encodeMessage(error.message)}&next=${encodeURIComponent(next)}`,
    );
  }

  logAuthDebug("sign_up.result", {
    next,
    hasUser: Boolean(data.user),
    error: null,
  });

  if (data.session) {
    redirect(next);
  }

  redirect(
    `/login?message=Account%20created.%20Check%20your%20email%20to%20continue.&next=${encodeURIComponent(next)}`,
  );
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const origin = await getOrigin();
  const supabase = await getSupabaseServerActionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/login`,
  });

  if (error) {
    redirect(`/login?error=${encodeMessage(error.message)}`);
  }

  redirect("/login?message=Password%20reset%20email%20sent");
}

export async function signInWithOAuthAction(formData: FormData) {
  const provider = String(formData.get("provider") ?? "") as "google" | "apple";
  const next = getSafeRedirectTarget(
    String(formData.get("next") ?? DEFAULT_AUTHENTICATED_ENTRY_PATH),
    DEFAULT_AUTHENTICATED_ENTRY_PATH,
  );
  const supabase = await getSupabaseServerActionClient();
  const origin = await getOrigin();
  logAuthDebug("oauth.start", {
    next,
  });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error || !data.url) {
    logAuthDebug("oauth.result", {
      next,
      error: error?.message ?? "OAuth start failed",
    });
    redirect(`/login?error=${encodeMessage(error?.message ?? "OAuth start failed")}`);
  }

  logAuthDebug("oauth.result", {
    next,
    error: null,
  });
  redirect(data.url);
}
