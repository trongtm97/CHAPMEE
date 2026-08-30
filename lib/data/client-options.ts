import type { DatabaseClientOptions } from "@/lib/db/types";
import { readEnv } from "@/lib/env/legacy-env";

const DEFAULT_TIMEOUT_MS = 12_000;

export function getPostgrestTimeoutMs() {
  const raw = readEnv("CHAPMEE_POSTGREST_TIMEOUT_MS", "CHAPCHAP_POSTGREST_TIMEOUT_MS");
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

export function getPostgrestClientOptions(): Pick<DatabaseClientOptions<"public">, "db"> {
  return {
    db: {
      timeout: getPostgrestTimeoutMs()
    }
  };
}

export function isPostgrestAbortError(error: unknown) {
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
