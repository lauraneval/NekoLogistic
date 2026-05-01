import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  const env = getEnv();
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
          try {
            for (const cookie of cookiesToSet) {
              cookieStore.set(cookie.name, cookie.value, cookie.options);
            }
          } catch {
            // Server Components can read cookies but cannot write them.
            // Route Handlers and Server Actions will still persist refreshed cookies.
          }
        },
      },
    },
  );
}
