type SupabaseEnv = {
  url: string;
  anonKey: string;
};

function readRequiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local using .env.example as a template.`
    );
  }

  return value;
}

export function getSupabaseEnv(): SupabaseEnv {
  return {
    url: readRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    anonKey: readRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  };
}
