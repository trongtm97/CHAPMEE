/** Guard after `.single()` / `.insert().select().single()` when error was already handled. */
export function requirePostgrestData<T>(
  data: T | null | undefined,
  message = "Expected database row"
): T {
  if (data == null) {
    throw new Error(message);
  }
  return data;
}
