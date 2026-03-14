import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

import { logAuthDebug } from "@/lib/auth/debug";
import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

export async function getSupabaseServerActionClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          logAuthDebug("server_action.setAll", {
            requestCookies: cookieStore.getAll(),
            responseCookies: cookiesToSet,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}
