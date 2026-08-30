/**
 * Dynamic rows from PostgREST. Intentionally loose while legacy queries lack generated DB types.
 * Prefer explicit domain types at module boundaries (mappers), not deep in UI.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgrestRow = Record<string, any>;

/** Array results from `.select()` — compatible with legacy typed row arrays. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgrestRows = any[];

export function postgrestRows<T extends PostgrestRow = PostgrestRow>(
  data: PostgrestRows | null | undefined
): T[] {
  return (data ?? []) as T[];
}

export function postgrestRow<T extends PostgrestRow = PostgrestRow>(
  data: PostgrestRow | null | undefined
): T | null {
  return (data ?? null) as T | null;
}
