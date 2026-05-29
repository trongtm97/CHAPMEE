"use server";

import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type { ReporterQualitySummary } from "@/types/moderation";

export async function getSpamSuspectedReporters(): Promise<
  ReporterQualitySummary[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reporter_quality")
    .select(
      `
      user_id,
      trust_score,
      reports_submitted,
      reports_valid,
      reports_rejected,
      reports_abuse,
      spam_suspected,
      profiles:user_id ( display_name, username )
    `
    )
    .eq("spam_suspected", true)
    .order("reports_abuse", { ascending: false })
    .limit(20);

  if (error) {
    if (isMissingSchemaError(error)) {
      return [];
    }
    return [];
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const submitted = row.reports_submitted ?? 0;
    const valid = row.reports_valid ?? 0;
    return {
      userId: row.user_id,
      trustScore: row.trust_score ?? 0,
      reportsSubmitted: submitted,
      reportsValid: valid,
      reportsRejected: row.reports_rejected ?? 0,
      reportsAbuse: row.reports_abuse ?? 0,
      spamSuspected: true,
      accuracyPercent:
        submitted > 0 ? Math.round((valid / submitted) * 100) : null,
      displayName: profile?.display_name ?? profile?.username ?? null
    };
  });
}
