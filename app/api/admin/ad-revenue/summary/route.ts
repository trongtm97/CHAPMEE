import { NextResponse } from "next/server";
import { getAdRevenueAdminDashboard } from "@/lib/ads/get-ad-revenue-admin-dashboard";
import { getAdRevenueEstimateSettings } from "@/lib/ads/ad-revenue-settings";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
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

  const [dashboardResult, settings] = await Promise.all([
    getAdRevenueAdminDashboard(filters),
    getAdRevenueEstimateSettings({ useAdmin: true })
  ]);

  return NextResponse.json({
    settings,
    dashboard: dashboardResult.dashboard,
    error: dashboardResult.error
  });
}
