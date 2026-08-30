function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }
  if ("message" in error) {
    return String(error.message ?? "");
  }
  return "";
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return undefined;
  }
  return error.code as string | undefined;
}

/** PostgREST / db schema drift: missing table, column, or relation. */
export function isMissingSchemaError(error: unknown) {
  const code = getErrorCode(error);
  if (code === "PGRST205" || code === "PGRST204" || code === "42703") {
    return true;
  }

  const message = getErrorMessage(error);
  if (!message) {
    return false;
  }

  try {
    const parsed = JSON.parse(message) as { code?: string };
    if (
      parsed.code === "PGRST205" ||
      parsed.code === "PGRST204" ||
      parsed.code === "42703"
    ) {
      return true;
    }
  } catch {
    // not JSON
  }

  return (
    message.includes("PGRST205") ||
    message.includes("PGRST204") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}
