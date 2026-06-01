import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadTaxonomyQualityRules,
  runTaxonomyQualityCheckForStory
} from "@/lib/content-taxonomy-quality/rule-engine";

const TAXONOMY_REPORT_REASONS = [
  "wrong_taxonomy_tag",
  "missing_content_warning",
  "wrong_age_rating"
] as const;

export async function syncTaxonomyReportToQualityFlag(
  supabase: SupabaseClient,
  targetType: string,
  targetId: string,
  reasonCode: string,
  reportId: string
) {
  if (targetType !== "story") return;
  if (!TAXONOMY_REPORT_REASONS.includes(reasonCode as (typeof TAXONOMY_REPORT_REASONS)[number])) {
    return;
  }

  const rules = await loadTaxonomyQualityRules(supabase);
  await runTaxonomyQualityCheckForStory(supabase, targetId, rules);

  const reportRule = rules.user_reported_wrong_tag;
  const threshold =
    typeof reportRule?.config?.report_threshold === "number"
      ? reportRule.config.report_threshold
      : 3;

  const { count } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("target_type", "story")
    .eq("target_id", targetId)
    .in("reason_code", [...TAXONOMY_REPORT_REASONS])
    .in("status", ["pending", "reviewing", "escalated"]);

  if ((count ?? 0) < threshold) return;

  const flagType =
    reasonCode === "missing_content_warning"
      ? "missing_warning"
      : "user_reported_wrong_tag";

  const { data: existing } = await supabase
    .from("content_taxonomy_quality_flags")
    .select("id, details_json")
    .eq("story_id", targetId)
    .eq("flag_type", flagType)
    .in("status", ["open", "reviewing", "sent_to_creator"])
    .maybeSingle();

  const details = {
    ...((existing?.details_json as Record<string, unknown>) ?? {}),
    reportIds: [
      ...(((existing?.details_json as Record<string, unknown>)?.reportIds as string[]) ??
        []),
      reportId
    ],
    reportCount: count
  };

  if (existing?.id) {
    await supabase
      .from("content_taxonomy_quality_flags")
      .update({
        reason: `Độc giả report phân loại (${count} report, ngưỡng ${threshold}).`,
        details_json: details,
        detected_by: "user_report",
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("content_taxonomy_quality_flags").insert({
      story_id: targetId,
      flag_type: flagType,
      severity: reportRule?.severity ?? "medium",
      reason: `Độc giả report phân loại (${count} report).`,
      details_json: details,
      detected_by: "user_report",
      status: "open"
    });
  }
}
