import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_AUTHENTICATED_ENTRY_PATH,
  getCurrentSessionState,
  getSafeRedirectTarget,
} from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { createRouteHandlerClient } from "@/lib/supabase/route-handler";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirectTarget(
    requestUrl.searchParams.get("next"),
    DEFAULT_AUTHENTICATED_ENTRY_PATH,
  );

  if (!isSupabaseConfigured) {
    return NextResponse.redirect(new URL("/login?error=supabase_not_configured", request.url));
  }

  if (!code) {
    const { hasSession } = await getCurrentSessionState();

    if (hasSession) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createRouteHandlerClient({
    request,
    response,
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
  }

  return response;
}
