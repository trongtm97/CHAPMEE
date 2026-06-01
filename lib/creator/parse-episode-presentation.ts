import {
  isComposerStructuredDocument,
  tryParseStoredComposerDocument
} from "@/lib/composer/serializer";
import { isContentFormat, isPresentationMode, modeUsesStructuredContent } from "@/lib/presentation/constants";
import {
  parseStructuredContentForMode,
  parseStructuredContentJson,
  validateStructuredContentForImport
} from "@/lib/presentation/parse-structured";
import { resolveEffectivePresentationMode } from "@/lib/presentation/resolve-mode";
import type { ContentFormat, PresentationMode } from "@/types/presentation";

export type EpisodePresentationFields = {
  presentationMode: PresentationMode;
  contentFormat: ContentFormat | null;
  structuredContent: unknown | null;
  chapterPresentationMode: string | null;
};

export function parseEpisodePresentationFields(
  formData: FormData,
  storyPresentationMode: string | null
): { ok: true; values: EpisodePresentationFields } | { ok: false; error: string } {
  const editorMode = String(formData.get("presentation_editor_mode") ?? "plain").trim();
  const structuredJson = String(formData.get("structured_content_json") ?? "").trim();
  const chapterModeRaw = String(formData.get("chapter_presentation_mode") ?? "").trim();

  const effectiveMode = resolveEffectivePresentationMode({
    chapterMode: chapterModeRaw || null,
    storyMode: storyPresentationMode
  });

  if (!modeUsesStructuredContent(effectiveMode)) {
    return {
      ok: true,
      values: {
        presentationMode: effectiveMode,
        contentFormat: "plain_text",
        structuredContent: null,
        chapterPresentationMode: chapterModeRaw || null
      }
    };
  }

  if (editorMode === "plain") {
    return {
      ok: true,
      values: {
        presentationMode: effectiveMode,
        contentFormat: "plain_text",
        structuredContent: null,
        chapterPresentationMode: chapterModeRaw || null
      }
    };
  }

  if (!structuredJson) {
    return {
      ok: false,
      error: "Vui lòng nhập nội dung cấu trúc (JSON) hoặc chuyển về soạn văn xuôi."
    };
  }

  const jsonParsed = parseStructuredContentJson(structuredJson);
  if (!jsonParsed.ok) {
    return { ok: false, error: jsonParsed.error };
  }

  const importCheck = validateStructuredContentForImport(
    effectiveMode,
    structuredJson
  );
  if (!importCheck.ok) {
    return importCheck;
  }

  if (jsonParsed.value === null) {
    return { ok: false, error: "Nội dung cấu trúc trống." };
  }

  const contentFormatDefault =
    isComposerStructuredDocument(jsonParsed.value) ||
    tryParseStoredComposerDocument(jsonParsed.value).ok
      ? "structured_blocks"
      : "structured_json";

  const contentFormatRaw = String(formData.get("content_format") ?? contentFormatDefault);
  const contentFormat = isContentFormat(contentFormatRaw)
    ? contentFormatRaw
    : contentFormatDefault;

  const composerDoc = tryParseStoredComposerDocument(jsonParsed.value);
  if (composerDoc.ok) {
    return {
      ok: true,
      values: {
        presentationMode: effectiveMode,
        contentFormat: "structured_blocks",
        structuredContent: composerDoc.data,
        chapterPresentationMode: chapterModeRaw || null
      }
    };
  }

  if (isComposerStructuredDocument(jsonParsed.value)) {
    return {
      ok: true,
      values: {
        presentationMode: effectiveMode,
        contentFormat,
        structuredContent: jsonParsed.value,
        chapterPresentationMode: chapterModeRaw || null
      }
    };
  }

  const schemaParsed = parseStructuredContentForMode(effectiveMode, jsonParsed.value);
  if (!schemaParsed.ok) {
    return { ok: false, error: schemaParsed.error };
  }

  return {
    ok: true,
    values: {
      presentationMode: effectiveMode,
      contentFormat,
      structuredContent: schemaParsed.data,
      chapterPresentationMode: chapterModeRaw || null
    }
  };
}

export function isValidPresentationModeForForm(value: string): value is PresentationMode {
  return isPresentationMode(value);
}
