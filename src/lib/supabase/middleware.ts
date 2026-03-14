import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

import { logAuthDebug } from "@/lib/auth/debug";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

type UpdateSessionOptions = {
  requestHeaders?: Headers;
};

export async function updateSession(request: NextRequest, options: UpdateSessionOptions = {}) {
  const requestHeaders = options.requestHeaders ?? request.headers;

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          logAuthDebug("middleware.setAll", {
            pathname: request.nextUrl.pathname,
            requestCookies: request.cookies.getAll(),
            responseCookies: cookiesToSet,
          });
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  logAuthDebug("middleware.getUser", {
    pathname: request.nextUrl.pathname,
    requestCookies: request.cookies.getAll(),
    responseCookies: response.cookies.getAll(),
    hasUser: Boolean(user),
  });

  return {
    response,
    user,
  };
}
