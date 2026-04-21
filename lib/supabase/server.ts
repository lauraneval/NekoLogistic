import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServerClient() {
  const env = getEnv();
  const cookieStore = await cookies();
  const headerList = await headers();
  const authHeader = headerList.get("authorization");

  // If there's a Bearer token, we use it to create a stateless client
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      return createServerClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
          cookies: {
            getAll() { return []; },
            setAll() { },
          },
        }
      );
    }
  }

  // Otherwise, use cookie-based client
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
            // This can be ignored if called from a Server Component
          }
        },
      },
    },
  );
}
