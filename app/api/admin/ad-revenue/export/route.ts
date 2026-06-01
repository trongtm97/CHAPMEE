import { NextResponse } from "next/server";
import { listAdDailyStatsForExport } from "@/lib/ads/get-ad-revenue-admin-dashboard";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { toCsv } from "@/lib/finance/export-csv";
import type { AdRevenueAdminFilters } from "@/types/ad-revenue";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filters: AdRevenueAdminFilters = {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    month: searchParams.get("month") ?? undefined,
    authorId: searchParams.get("authorId") ?? undefined,
    storyId: searchParams.get("storyId") ?? undefined,
    placementKey: searchParams.get("placementKey") ?? undefined,
    surface: searchParams.get("surface") ?? undefined,
    device: searchParams.get("device") ?? undefined
  };

  const { rows, error } = await listAdDailyStatsForExport(filters);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const headers = [
    "stat_date",
    "author_id",
    "story_id",
    "chapter_id",
    "placement_key",
    "surface",
    "device",
    "rendered_impressions",
    "estimated_pageviews",
    "estimated_reads",
    "estimated_revenue_vnd",
    "invalid_adjustment_vnd",
    "net_estimated_revenue_vnd"
  ];

  const csv = toCsv(
    headers,
    rows.map((row) => ({
      stat_date: row.stat_date,
      author_id: row.author_id,
      story_id: row.story_id ?? "",
      chapter_id: row.chapter_id ?? "",
      placement_key: row.placement_key ?? "",
      surface: row.surface ?? "",
      device: row.device ?? "",
      rendered_impressions: row.rendered_impressions,
      estimated_pageviews: row.estimated_pageviews,
      estimated_reads: row.estimated_reads,
      estimated_revenue_vnd: row.estimated_revenue_vnd,
      invalid_adjustment_vnd: row.invalid_adjustment_vnd,
      net_estimated_revenue_vnd: row.net_estimated_revenue_vnd
    }))
  );

  const filename = `ad-revenue-estimate-${filters.month ?? filters.from ?? "export"}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
