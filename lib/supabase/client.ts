import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { getEnv } from "../env";

export function createSupabaseBrowserClient() {
  const env = getEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
