import type { SupabaseClientOptions } from "@supabase/supabase-js";
import { readEnv } from "@/lib/env/legacy-env";

const DEFAULT_TIMEOUT_MS = 12_000;

export function getSupabaseDbTimeoutMs() {
  const raw = readEnv("CHAPMEE_SUPABASE_TIMEOUT_MS", "CHAPCHAP_SUPABASE_TIMEOUT_MS");
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

/** Shared Supabase client options — timeout + no custom fetch wrapper. */
export function getSupabaseClientOptions(): Pick<
  SupabaseClientOptions<"public">,
  "db"
> {
  return {
    db: {
      timeout: getSupabaseDbTimeoutMs()
    }
  };
}

export function isSupabaseAbortError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { name?: string; code?: string; message?: string };
  return (
    record.name === "AbortError" ||
    record.code === "ABORT_ERR" ||
    record.message?.includes("aborted") === true
  );
}
