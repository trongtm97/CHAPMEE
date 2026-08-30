import { getDefaultTemplateForMode } from "@/lib/composer/templates";
import { isComposerStructuredDocument, parseComposerDocument } from "@/lib/composer/serializer";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import { validateComposerContent } from "@/lib/composer/validate-composer-content";
import { migrateLegacyStructuredToComposer } from "@/lib/composer/migrate-legacy-to-composer";
import type { ComposerMode, ComposerStructuredContent } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

export type ComposerTemplateValidationResult = {
  doc: ComposerStructuredContent;
  ok: boolean;
  errors: string[];
  warnings: string[];
  source: "composer" | "legacy" | "default";
};

function validateTemplateDoc(
  mode: ComposerMode,
  doc: ComposerStructuredContent
): Pick<ComposerTemplateValidationResult, "ok" | "errors" | "warnings"> {
  const report = validateComposerContent(mode, doc, {
    previewViewed: true,
    strictPublish: false,
    storyContentWarningsConfirmed: true,
    storyHasContentWarnings: true
  });

  return {
    ok: report.valid,
    errors: report.errors.map((issue) => issue.message),
    warnings: report.warnings.map((issue) => issue.message)
  };
}

export function resolveComposerTemplateDocument(
  modeInput: string,
  rawTemplate: unknown
): ComposerTemplateValidationResult {
  const mode = presentationModeToComposerMode(modeInput);

  if (isComposerStructuredDocument(rawTemplate)) {
    const parsed = parseComposerDocument(rawTemplate);
    if (parsed.ok) {
      const doc = { ...parsed.data, mode };
      return {
        doc,
        source: "composer",
        ...validateTemplateDoc(mode, doc)
      };
    }
  }

  const migrated = migrateLegacyStructuredToComposer(mode as PresentationMode, rawTemplate);
  if (migrated) {
    const doc = { ...migrated, mode };
    return {
      doc,
      source: "legacy",
      ...validateTemplateDoc(mode, doc)
    };
  }

  const fallback = getDefaultTemplateForMode(mode);
  return {
    doc: fallback,
    source: "default",
    ...validateTemplateDoc(mode, fallback)
  };
}
