import { NextResponse, type NextRequest } from "next/server";

import {
  DEFAULT_AUTHENTICATED_ENTRY_PATH,
  buildLoginRedirectPath,
  getSafeRedirectTarget,
  isProtectedAppPath,
  isPublicAuthPath,
} from "@/lib/auth/session";
import { logAuthDebug } from "@/lib/auth/debug";
import { isSupabaseConfigured } from "@/lib/env";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-search", search);

  const { user, response } = await updateSession(request, {
    requestHeaders,
  });
  const isProtected = isProtectedAppPath(pathname);
  const isPublicAuthRoute = isPublicAuthPath(pathname);
  const isAuthCallbackExchange =
    pathname === "/auth/callback" && request.nextUrl.searchParams.has("code");

  if (!user && isProtected) {
    logAuthDebug("middleware.redirect_to_login", {
      pathname,
      requestCookies: request.cookies.getAll(),
      hasUser: false,
      next: `${pathname}${search}`,
    });
    return NextResponse.redirect(new URL(buildLoginRedirectPath(`${pathname}${search}`), request.url));
  }

  if (user && isPublicAuthRoute && !isAuthCallbackExchange) {
    const next = getSafeRedirectTarget(
      request.nextUrl.searchParams.get("next"),
      DEFAULT_AUTHENTICATED_ENTRY_PATH,
    );
    logAuthDebug("middleware.redirect_authenticated_user", {
      pathname,
      requestCookies: request.cookies.getAll(),
      hasUser: true,
      next,
    });
    return NextResponse.redirect(new URL(next, request.url));
  }

  logAuthDebug("middleware.allow", {
    pathname,
    requestCookies: request.cookies.getAll(),
    hasUser: Boolean(user),
  });
  response.headers.set("x-pathname", pathname);
  response.headers.set("x-search", search);
  return response;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/finance/:path*",
    "/chores/:path*",
    "/insights/:path*",
    "/onboarding/:path*",
    "/login",
    "/auth/callback",
  ],
};
