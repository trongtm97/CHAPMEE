/**
 * @deprecated Import from `@/lib/composer/validate-composer-content` for new code.
 * Thin wrappers kept for existing Studio/adapter imports.
 */
import {
  reportToLegacyResult,
  validateComposerContent,
  type ValidateComposerContentOptions
} from "@/lib/composer/validate-composer-content";
import { parseComposerDocument } from "@/lib/composer/serializer";
import type {
  ComposerBlockUnion,
  ComposerMode,
  ComposerStructuredContent,
  ComposerValidationIssue,
  ComposerValidationResult
} from "@/lib/composer/types";

export {
  validateComposerContent,
  reportToLegacyResult,
  type ValidateComposerContentOptions
} from "@/lib/composer/validate-composer-content";

export function validateComposerBlock(
  mode: ComposerMode,
  block: ComposerBlockUnion,
  options?: ValidateComposerContentOptions
): ComposerValidationIssue[] {
  const report = validateComposerContent(
    mode,
    {
      version: 1,
      mode,
      blocks: [block],
      metadata: { characters: [], warnings: [], composer_version: 1 }
    },
    options
  );
  return [...report.errors, ...report.warnings];
}

export function validateComposerDocument(
  doc: ComposerStructuredContent,
  options?: ValidateComposerContentOptions
): ComposerValidationResult {
  return reportToLegacyResult(validateComposerContent(doc.mode, doc, options));
}

export function validateComposerForMode(
  mode: ComposerMode,
  raw: unknown,
  options?: ValidateComposerContentOptions
): { ok: true; data: ComposerStructuredContent } | { ok: false; error: string } {
  const parsed = parseComposerDocument(raw);
  if (!parsed.ok) {
    return parsed;
  }

  if (parsed.data.mode !== mode) {
    return {
      ok: false,
      error: `Mode trong JSON (${parsed.data.mode}) không khớp mode truyện (${mode}).`
    };
  }

  const report = validateComposerContent(mode, parsed.data, options);
  if (!report.valid) {
    return {
      ok: false,
      error: report.errors[0]?.message ?? "Nội dung Composer không hợp lệ."
    };
  }

  return { ok: true, data: parsed.data };
}

export function validateComposerForPublish(
  doc: ComposerStructuredContent,
  options?: Omit<ValidateComposerContentOptions, "strictPublish">
): ComposerValidationResult {
  return reportToLegacyResult(
    validateComposerContent(doc.mode, doc, { ...options, strictPublish: true })
  );
}

export function validateComposerJsonForImport(
  mode: ComposerMode,
  jsonText: string,
  options?: ValidateComposerContentOptions
): { ok: true } | { ok: false; error: string } {
  const trimmed = jsonText.trim();
  if (!trimmed) {
    return { ok: true };
  }

  try {
    const raw = JSON.parse(trimmed) as unknown;
    const result = validateComposerForMode(mode, raw, {
      ...options,
      strictPublish: true
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "JSON không hợp lệ." };
  }
}
