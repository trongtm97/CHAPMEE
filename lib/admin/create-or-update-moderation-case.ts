import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import { priorityToSeverity, severityToPriority } from "@/lib/admin/report-labels";
import type { ReportSeverity } from "@/types/reports";

type UpsertCaseInput = {
  targetType: string;
  targetId: string;
  reportedUserId?: string | null;
  reasonCode?: string | null;
  severity?: ReportSeverity;
  incrementCount?: boolean;
};

export async function findOrCreateModerationCase(input: UpsertCaseInput) {
  const supabase = await createClient();
  const severity = input.severity ?? "medium";

  const { data: existing, error: findError } = await supabase
    .from("moderation_cases")
    .select("id, report_count")
    .eq("target_type", input.targetType)
    .eq("target_id", input.targetId)
    .in("status", ["open", "reviewing"])
    .maybeSingle();

  if (findError && !isMissingSchemaError(findError)) {
    throw new Error(findError.message);
  }

  if (existing?.id) {
    if (input.incrementCount !== false) {
      await supabase
        .from("moderation_cases")
        .update({
          report_count: ((existing.report_count as number) ?? 1) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", existing.id);
    }
    return existing.id as string;
  }

  const { data: created, error: insertError } = await supabase
    .from("moderation_cases")
    .insert({
      target_type: input.targetType,
      target_id: input.targetId,
      reported_user_id: input.reportedUserId ?? null,
      primary_reason_code: input.reasonCode ?? null,
      severity,
      status: "open",
      report_count: 1
    })
    .select("id")
    .maybeSingle();

  if (insertError) {
    if (isMissingSchemaError(insertError)) return null;
    throw new Error(insertError.message);
  }

  return (created?.id as string) ?? null;
}

export async function linkReportsToCase(
  targetType: string,
  targetId: string,
  caseId: string | null
) {
  if (!caseId) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("reports")
    .update({ moderation_case_id: caseId })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .in("status", ["pending", "open", "reviewing"]);

  if (error && !isMissingSchemaError(error)) {
    throw new Error(error.message);
  }
}

export { priorityToSeverity, severityToPriority };
