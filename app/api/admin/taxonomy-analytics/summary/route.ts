import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsView } from "@/app/api/admin/taxonomy-analytics/_auth";
import { getTaxonomyAnalyticsSummary } from "@/lib/taxonomy-analytics/taxonomyAnalyticsService";

export async function GET(request: Request) {
  const guard = await requireTaxonomyAnalyticsView();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const payload = await getTaxonomyAnalyticsSummary(url);
  return NextResponse.json({ ok: true, ...payload });
}
