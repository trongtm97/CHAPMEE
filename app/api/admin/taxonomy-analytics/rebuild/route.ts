import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsRebuild } from "@/app/api/admin/taxonomy-analytics/_auth";
import { aggregateTaxonomyDateRange } from "@/lib/taxonomy-analytics/aggregate-daily";
import { createAdminClient } from "@/lib/supabase/admin";

type RebuildBody = {
  from?: string;
  to?: string;
};

export async function POST(request: Request) {
  const guard = await requireTaxonomyAnalyticsRebuild();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => ({}))) as RebuildBody;
  const from = body.from;
  const to = body.to;

  if (!from || !to) {
    return NextResponse.json(
      { ok: false, error: "Thiếu from/to để rebuild taxonomy analytics." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const results = await aggregateTaxonomyDateRange(supabase, from, to);
  const failed = results.find((row) => !row.ok);
  if (failed) {
    return NextResponse.json(
      { ok: false, error: failed.error ?? "Rebuild taxonomy aggregate thất bại." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    processedDays: results.length,
    termsProcessed: results.reduce((sum, row) => sum + row.termsProcessed, 0)
  });
}
