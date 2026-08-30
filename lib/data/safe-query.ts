import { isPostgrestAbortError } from "@/lib/data/client-options";

export async function withPostgrestFallback<T>(
  label: string,
  run: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[postgrest] ${label} failed:`, message);
    }
    return fallback;
  }
}

export function logPostgrestError(label: string, error: { message?: string } | null) {
  if (!error?.message) {
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(`[postgrest] ${label}:`, error.message);
  }
}

export { isPostgrestAbortError };
