import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { logAuthDebug } from "@/lib/auth/debug";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

type CreateRouteHandlerClientOptions = {
  request: NextRequest;
  response: NextResponse;
};

export function createRouteHandlerClient({
  request,
  response,
}: CreateRouteHandlerClientOptions) {
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          logAuthDebug("route_handler.setAll", {
            pathname: request.nextUrl.pathname,
            requestCookies: request.cookies.getAll(),
            responseCookies: cookiesToSet,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );
}
