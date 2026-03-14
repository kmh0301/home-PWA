import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_AUTHENTICATED_ENTRY_PATH,
  getCurrentSessionState,
  getSafeRedirectTarget,
} from "@/lib/auth/session";
import { logAuthDebug } from "@/lib/auth/debug";
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
    logAuthDebug("auth_callback.missing_code", {
      pathname: requestUrl.pathname,
      next,
      hasCode: false,
      requestCookies: request.cookies.getAll(),
    });
    const { hasSession } = await getCurrentSessionState();

    if (hasSession) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  logAuthDebug("auth_callback.start", {
    pathname: requestUrl.pathname,
    next,
    hasCode: true,
    requestCookies: request.cookies.getAll(),
  });
  const supabase = createRouteHandlerClient({
    request,
    response,
  });
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logAuthDebug("auth_callback.result", {
      pathname: requestUrl.pathname,
      next,
      requestCookies: request.cookies.getAll(),
      responseCookies: response.cookies.getAll(),
      error: error.message,
    });
    return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
  }

  logAuthDebug("auth_callback.result", {
    pathname: requestUrl.pathname,
    next,
    requestCookies: request.cookies.getAll(),
    responseCookies: response.cookies.getAll(),
    error: null,
  });
  return response;
}
