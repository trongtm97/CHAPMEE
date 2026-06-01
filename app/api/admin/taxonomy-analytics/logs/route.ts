import { NextResponse } from "next/server";
import { requireTaxonomyAnalyticsView } from "@/app/api/admin/taxonomy-analytics/_auth";

export async function GET() {
  const guard = await requireTaxonomyAnalyticsView();
  if (!guard.ok) return guard.response;

  // Placeholder until aggregate log table is introduced.
  return NextResponse.json({
    ok: true,
    items: [],
    message:
      "Chưa có bảng nhật ký aggregate taxonomy analytics. Endpoint sẵn sàng để nối dữ liệu sau."
  });
}
