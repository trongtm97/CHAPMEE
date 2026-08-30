/** Standard UTF-8 Content-Type values for ChapMee HTTP responses. */
export const CONTENT_TYPE_JSON_UTF8 = "application/json; charset=utf-8";
export const CONTENT_TYPE_CSV_UTF8 = "text/csv; charset=utf-8";
export const CONTENT_TYPE_PLAIN_UTF8 = "text/plain; charset=utf-8";
export const CONTENT_TYPE_HTML_UTF8 = "text/html; charset=utf-8";

/** Prefix CSV with BOM for Excel compatibility (export only — not for source files). */
export function withCsvUtf8Bom(csv: string): string {
  return csv.startsWith("\uFEFF") ? csv : `\uFEFF${csv}`;
}
