/** Re-export + chapter-specific local URL guard helpers. */
export {
  LOCAL_MEDIA_URL_ERROR,
  assertChapterContentSafeForPersist,
  assertStructuredContentSafeForPersist,
  scanContentForForbiddenLocalUrls,
  validatePlainChapterContent,
  validateStructuredContentJson
} from "@/lib/media/content-media-validator";

export { containsForbiddenLocalMediaUrl } from "@/lib/media/media-url";

import {
  validatePlainChapterContent,
  validateStructuredContentJson
} from "@/lib/media/content-media-validator";

export function validateEpisodeBodyForStorage(input: {
  content: string;
  structuredContent: unknown | null;
}): { ok: true } | { ok: false; error: string } {
  const plainCheck = validatePlainChapterContent(input.content);
  if (!plainCheck.ok) {
    return plainCheck;
  }

  if (input.structuredContent != null) {
    const jsonCheck = validateStructuredContentJson(JSON.stringify(input.structuredContent));
    if (!jsonCheck.ok) {
      return jsonCheck;
    }
  }

  return { ok: true };
}
