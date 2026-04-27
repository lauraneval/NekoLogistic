import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const isServer = typeof window === "undefined";

  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV ?? "development",
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration: ${message}`);
  }

  if (isServer && !parsed.data.SUPABASE_SERVICE_ROLE_KEY && process.env.NODE_ENV === "production") {
    console.warn("Warning: SUPABASE_SERVICE_ROLE_KEY is missing in production server environment");
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

