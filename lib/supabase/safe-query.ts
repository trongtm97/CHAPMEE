import { isSupabaseAbortError } from "@/lib/supabase/client-options";

export async function withSupabaseFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[supabase] ${label} failed:`, message);
    }
    return fallback;
  }
}

export function logSupabaseError(label: string, error: { message?: string } | null) {
  if (!error?.message) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(`[supabase] ${label}:`, error.message);
  }
}

export { isSupabaseAbortError };
