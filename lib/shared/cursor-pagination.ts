/**
 * Keyset (cursor) pagination helpers for stable ordering by (sort_value, id).
 * Use when offset pagination becomes slow on large catalogs.
 */

export type CatalogDateCursor = {
  sortValue: string;
  id: string;
};

const CURSOR_SEPARATOR = "|";

export function encodeCatalogDateCursor(cursor: CatalogDateCursor): string {
  return Buffer.from(`${cursor.sortValue}${CURSOR_SEPARATOR}${cursor.id}`).toString(
    "base64url"
  );
}

export function decodeCatalogDateCursor(raw: string | undefined | null): CatalogDateCursor | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const separatorIndex = decoded.lastIndexOf(CURSOR_SEPARATOR);
    if (separatorIndex <= 0) {
      return null;
    }

    const sortValue = decoded.slice(0, separatorIndex);
    const id = decoded.slice(separatorIndex + 1);
    if (!sortValue || !id) {
      return null;
    }

    return { sortValue, id };
  } catch {
    return null;
  }
}

export function buildKeysetOrFilter(
  column: "published_at" | "updated_at",
  cursor: CatalogDateCursor,
  ascending: boolean
): { column: string; op: "gt" | "lt"; value: string; idOp: "gt" | "lt"; id: string } {
  return {
    column,
    op: ascending ? "gt" : "lt",
    value: cursor.sortValue,
    idOp: ascending ? "gt" : "lt",
    id: cursor.id
  };
}
