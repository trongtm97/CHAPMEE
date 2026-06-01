import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsView } from "@/app/api/admin/taxonomy-analytics/_auth";
import { getCreatorContribution } from "@/lib/taxonomy-analytics/taxonomyAnalyticsService";

export async function GET(request: Request) {
  const guard = await requireTaxonomyAnalyticsView();
  if (!guard.ok) return guard.response;

  const payload = await getCreatorContribution(new URL(request.url));
  return NextResponse.json({ ok: true, ...payload });
}
