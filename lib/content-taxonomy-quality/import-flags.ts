import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadTaxonomyQualityRules,
  runTaxonomyQualityCheckForStory
} from "@/lib/content-taxonomy-quality/rule-engine";
import type { TaxonomyQualitySeverity } from "@/types/content-taxonomy-quality";

export type ImportRowIssue = {
  rowIndex: number;
  storyId?: string;
  messages: string[];
};

function countMessagePattern(messages: string[], pattern: RegExp) {
  return messages.filter((m) => pattern.test(m)).length;
}

export async function recordImportBatchTaxonomyFlags(
  supabase: SupabaseClient,
  input: {
    jobId: string;
    rowIssues: ImportRowIssue[];
    importedStoryIds: string[];
  }
) {
  const rules = await loadTaxonomyQualityRules(supabase);
  const importRule = rules.import_error;
  if (importRule?.isEnabled === false) {
    return { flagsCreated: 0 };
  }

  const invalidSlugThreshold =
    typeof importRule?.config?.invalid_slug_threshold === "number"
      ? importRule.config.invalid_slug_threshold
      : 5;
  const missingRequiredThreshold =
    typeof importRule?.config?.missing_required_threshold === "number"
      ? importRule.config.missing_required_threshold
      : 10;

  const allMessages = input.rowIssues.flatMap((r) => r.messages);
  const invalidSlugCount = countMessagePattern(
    allMessages,
    /không tồn tại|không hợp lệ/i
  );
  const missingRequiredCount = countMessagePattern(allMessages, /bắt buộc/i);
  const tagLimitCount = countMessagePattern(allMessages, /tối đa/i);

  const batchExceeds =
    invalidSlugCount >= invalidSlugThreshold ||
    missingRequiredCount >= missingRequiredThreshold;

  let flagsCreated = 0;
  const severity = (importRule?.severity ?? "medium") as TaxonomyQualitySeverity;

  if (batchExceeds) {
    for (const storyId of input.importedStoryIds) {
      const storyIssues = input.rowIssues.filter((r) => r.storyId === storyId);
      if (storyIssues.length === 0) continue;

      const reason = `Import job có lỗi taxonomy (${storyIssues.length} dòng liên quan).`;
      await upsertImportFlag(supabase, {
        storyId,
        jobId: input.jobId,
        severity,
        reason,
        details: {
          importJobId: input.jobId,
          invalidSlugCount,
          missingRequiredCount,
          tagLimitCount,
          rowIssues: storyIssues
        }
      });
      flagsCreated += 1;
    }
  }

  for (const storyId of input.importedStoryIds) {
    await runTaxonomyQualityCheckForStory(supabase, storyId, rules);
  }

  return { flagsCreated };
}

async function upsertImportFlag(
  supabase: SupabaseClient,
  input: {
    storyId: string;
    jobId: string;
    severity: TaxonomyQualitySeverity;
    reason: string;
    details: Record<string, unknown>;
  }
) {
  const { data: existing } = await supabase
    .from("content_taxonomy_quality_flags")
    .select("id")
    .eq("story_id", input.storyId)
    .eq("flag_type", "import_error")
    .in("status", ["open", "reviewing", "sent_to_creator"])
    .maybeSingle();

  const payload = {
    severity: input.severity,
    reason: input.reason,
    details_json: input.details,
    detected_by: "import" as const,
    updated_at: new Date().toISOString()
  };

  if (existing?.id) {
    await supabase
      .from("content_taxonomy_quality_flags")
      .update(payload)
      .eq("id", existing.id);
  } else {
    await supabase.from("content_taxonomy_quality_flags").insert({
      story_id: input.storyId,
      flag_type: "import_error",
      status: "open",
      ...payload
    });
  }
}
