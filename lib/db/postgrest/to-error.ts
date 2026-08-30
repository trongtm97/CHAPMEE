import type { PostgrestError } from "@/lib/db/types";

export function toThrownError(
  error: PostgrestError | null | undefined,
  fallback = "Database request failed"
): Error {
  if (!error) {
    return new Error(fallback);
  }
  const message = error.message?.trim() || fallback;
  const err = new Error(message);
  if (error.code) {
    (err as Error & { code?: string }).code = error.code;
  }
  return err;
}
