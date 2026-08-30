import type { TranslationType } from "@/lib/content-origin/content-origin-types";

export const DEFAULT_TRANSLATED_LANGUAGE = "Tiếng Việt";
export const DEFAULT_TRANSLATION_TYPE: TranslationType = "fan_translation";

export function resolveTranslationFormDefaults(input: {
  translatedLanguage?: string;
  translationType?: string;
  sourcePlatform?: string;
  licenseNote?: string;
  licenseDocumentMediaId?: string;
}) {
  return {
    translatedLanguage: input.translatedLanguage?.trim() || DEFAULT_TRANSLATED_LANGUAGE,
    translationType: (input.translationType?.trim() ||
      DEFAULT_TRANSLATION_TYPE) as TranslationType,
    sourcePlatform: input.sourcePlatform?.trim() || null,
    licenseNote: input.licenseNote?.trim() || null,
    licenseDocumentMediaId: input.licenseDocumentMediaId?.trim() || null
  };
}
