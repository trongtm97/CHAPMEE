import { sanitizeImportText } from "@/lib/encoding/sanitize-import-text";

/** Trim and repair common Vietnamese mojibake in import spreadsheet cells. */
export function normalizeImportCell(value: string): string {
  const trimmed = String(value ?? "").trim();
  return sanitizeImportText(trimmed);
}
