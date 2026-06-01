import { getComposerAdminSettings } from "@/lib/composer/composer-settings";
import { isComposerStructuredDocument } from "@/lib/composer/serializer";
import {
  validateComposerContent,
  type ValidateComposerContentOptions
} from "@/lib/composer/validate-composer-content";
import { presentationModeToComposerMode } from "@/lib/composer/modes";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { PresentationMode } from "@/types/presentation";

export type EpisodeComposerValidationPayload = {
  validation_status: "valid" | "warnings" | "invalid" | "not_checked" | null;
  validation_errors: Array<{
    code: string;
    message: string;
    blockId?: string;
    severity: "error" | "warning" | "info";
    field?: string;
  }>;
  last_validated_at: string | null;
};

function mapIssues(
  issues: Array<{
    code: string;
    message: string;
    blockId?: string;
    level?: string;
    severity?: string;
    field?: string;
  }>
) {
  return issues.map((issue) => ({
    code: issue.code,
    message: issue.message,
    blockId: issue.blockId,
    field: issue.field,
    severity: (issue.level ?? issue.severity ?? "warning") as
      | "error"
      | "warning"
      | "info"
  }));
}

export async function runEpisodeComposerValidation(input: {
  presentationMode: PresentationMode;
  structuredContent: unknown | null;
  contentFormat: string | null;
  options?: ValidateComposerContentOptions;
}): Promise<EpisodeComposerValidationPayload> {
  const now = new Date().toISOString();

  if (
    !input.structuredContent ||
    input.contentFormat !== "structured_blocks" ||
    !isComposerStructuredDocument(input.structuredContent)
  ) {
    return {
      validation_status: "not_checked",
      validation_errors: [],
      last_validated_at: null
    };
  }

  const adminSettings = await getComposerAdminSettings();
  const mode = presentationModeToComposerMode(input.presentationMode);
  const doc = input.structuredContent as ComposerStructuredContent;
  const report = validateComposerContent(mode, doc, {
    strictPublish: true,
    adminSettings,
    settings: adminSettings.validation,
    ...input.options
  });

  const allIssues = [...report.errors, ...report.warnings, ...report.info];

  if (!report.valid) {
    return {
      validation_status: "invalid",
      validation_errors: mapIssues(allIssues),
      last_validated_at: now
    };
  }

  if (report.warnings.length > 0) {
    return {
      validation_status: "warnings",
      validation_errors: mapIssues(report.warnings),
      last_validated_at: now
    };
  }

  return {
    validation_status: "valid",
    validation_errors: [],
    last_validated_at: now
  };
}

export function runComposerImportValidation(
  mode: PresentationMode,
  structured: unknown,
  options?: ValidateComposerContentOptions
): { ok: true } | { ok: false; error: string } {
  if (!isComposerStructuredDocument(structured)) {
    return { ok: true };
  }
  const composerMode = presentationModeToComposerMode(mode);
  const report = validateComposerContent(composerMode, structured, {
    ...options,
    strictPublish: true
  });
  if (!report.valid) {
    return { ok: false, error: report.errors[0]?.message ?? "Không đủ nội dung để lưu." };
  }
  return { ok: true };
}
