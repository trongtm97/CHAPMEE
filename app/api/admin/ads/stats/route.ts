import { NextResponse } from "next/server";
import { getAdPlacementStatsAdmin } from "@/lib/ads/admin/placements";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ads");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const result = await getAdPlacementStatsAdmin();
  return NextResponse.json(result);
}
