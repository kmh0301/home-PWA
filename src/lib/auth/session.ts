import type { Session, User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/env";

export const DEFAULT_AUTHENTICATED_ENTRY_PATH = "/";

const PUBLIC_AUTH_PATHS = new Set(["/login", "/auth/callback"]);
const PROTECTED_APP_PREFIXES = ["/dashboard", "/finance", "/chores", "/insights", "/onboarding"];

export type CurrentSessionState = {
  session: Session | null;
  user: User | null;
  hasSession: boolean;
};

export async function getCurrentSessionState(): Promise<CurrentSessionState> {
  if (!isSupabaseConfigured) {
    return {
      session: null,
      user: null,
      hasSession: false,
    };
  }

  const { getSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return {
      session: null,
      user: null,
      hasSession: false,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    session,
    user,
    hasSession: Boolean(user),
  };
}

export function getSafeRedirectTarget(
  next: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_ENTRY_PATH,
) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }

  const url = new URL(next, "http://localhost");
  const pathname = url.pathname;

  if (PUBLIC_AUTH_PATHS.has(pathname)) {
    return fallback;
  }

  return `${pathname}${url.search}`;
}

export function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

export function isProtectedAppPath(pathname: string) {
  return pathname === "/" || PROTECTED_APP_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function buildLoginRedirectPath(next: string) {
  const loginUrl = new URL("/login", "http://localhost");

  loginUrl.searchParams.set("next", getSafeRedirectTarget(next));

  return `${loginUrl.pathname}${loginUrl.search}`;
}
