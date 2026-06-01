import { getDefaultStructuredTemplate } from "@/lib/presentation/default-templates";
import type { PresentationMode } from "@/types/presentation";

export function stringifyStructuredTemplate(
  mode: PresentationMode,
  example?: Record<string, unknown> | null
): string {
  if (example && Object.keys(example).length > 0) {
    return JSON.stringify(example, null, 2);
  }
  const fallback = getDefaultStructuredTemplate(mode);
  return fallback ? JSON.stringify(fallback, null, 2) : "{}";
}
