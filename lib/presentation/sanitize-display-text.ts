import { sanitizePlainContent } from "@/lib/editor/sanitize-content";

/** Safe display text for presentation renderers (no HTML). */
export function sanitizeDisplayText(value: string): string {
  return sanitizePlainContent(value).trim();
}
