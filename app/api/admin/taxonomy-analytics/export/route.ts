import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsView } from "@/app/api/admin/taxonomy-analytics/_auth";
import { getTaxonomyAnalyticsDataset } from "@/lib/taxonomy-analytics/taxonomyAnalyticsService";

function toCsv(headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  return [headers.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
}

export async function GET(request: Request) {
  const guard = await requireTaxonomyAnalyticsView();
  if (!guard.ok) return guard.response;

  const context = guard.context;
  const canExport =
    context.permissions.includes("taxonomy.export") ||
    context.permissions.includes("admin.settings.update");
  if (!canExport) {
    return NextResponse.json(
      { ok: false, error: "Bạn không có quyền xuất taxonomy analytics." },
      { status: 403 }
    );
  }

  const { data } = await getTaxonomyAnalyticsDataset(new URL(request.url));
  const rows = data.topByReads.map((row) => [
    row.type,
    row.termName,
    row.activeStories,
    row.impressions,
    row.clicks,
    row.storyStarts,
    row.ctr,
    row.completionRate,
    row.revenueCoin,
    row.reportsWrongTag
  ]);

  const csv = toCsv(
    [
      "taxonomy_group",
      "term",
      "stories",
      "impressions",
      "clicks",
      "starts",
      "ctr_pct",
      "completion_pct",
      "coin_revenue",
      "wrong_tag_reports"
    ],
    rows
  );

  const fileName = `chapmee-taxonomy-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
