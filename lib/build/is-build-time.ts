/** True during `next build` when Postgres/Redis are not available in the Docker builder. */
export function isNextBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.CHAPMEE_SKIP_BUILD_TIME_DATA === "true"
  );
}

export function isOfflineDbError(error: unknown): boolean {
  if (isNextBuildPhase()) {
    return true;
  }
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: string }).code ?? "")
      : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    message.includes("ECONNREFUSED") ||
    message.includes("connect ETIMEDOUT")
  );
}
