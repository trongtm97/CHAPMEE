"use server";

import {
  aggregateTaxonomyDailyMetrics,
  aggregateTaxonomyDateRange,
  defaultAggregationDate
} from "@/lib/taxonomy-analytics/aggregate-daily";
import { TAXONOMY_PERMISSION_FALLBACK } from "@/lib/admin/taxonomy-permissions";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import { createAdminClient } from "@/lib/supabase/admin";

export async function rebuildTaxonomyAnalyticsAction(input?: {
  from?: string;
  to?: string;
  date?: string;
}) {
  const guard = await requireAnyPermission(
    [
      "taxonomy.view",
      ...TAXONOMY_PERMISSION_FALLBACK.view,
      "admin.settings.update"
    ],
    { returnTo: "/admin/taxonomy-analytics" }
  );

  if (!guard.ok) {
    return { ok: false as const, error: guard.error };
  }

  const supabase = createAdminClient();

  if (input?.from && input?.to) {
    const results = await aggregateTaxonomyDateRange(supabase, input.from, input.to);
    const failed = results.find((row) => !row.ok);
    if (failed) {
      return { ok: false as const, error: failed.error ?? "Aggregation failed." };
    }
    return {
      ok: true as const,
      processedDays: results.length,
      termsProcessed: results.reduce((sum, row) => sum + row.termsProcessed, 0)
    };
  }

  const date = input?.date ?? defaultAggregationDate();
  const result = await aggregateTaxonomyDailyMetrics(supabase, date);
  if (!result.ok) {
    return { ok: false as const, error: result.error ?? "Aggregation failed." };
  }

  return {
    ok: true as const,
    date: result.date,
    termsProcessed: result.termsProcessed
  };
}
