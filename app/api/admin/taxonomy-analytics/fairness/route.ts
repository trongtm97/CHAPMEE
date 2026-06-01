import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsView } from "@/app/api/admin/taxonomy-analytics/_auth";
import { getFairnessInsights } from "@/lib/taxonomy-analytics/taxonomyAnalyticsService";

export async function GET(request: Request) {
  const guard = await requireTaxonomyAnalyticsView();
  if (!guard.ok) return guard.response;

  const payload = await getFairnessInsights(new URL(request.url));
  return NextResponse.json({ ok: true, ...payload });
}
