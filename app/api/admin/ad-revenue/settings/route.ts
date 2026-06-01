import { NextResponse } from "next/server";
import {
  getAdRevenueEstimateSettings,
  updateAdRevenueEstimateSettings
} from "@/lib/ads/ad-revenue-settings";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import type { AdRevenueEstimateSettingsInput } from "@/types/ad-revenue";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const settings = await getAdRevenueEstimateSettings({ useAdmin: true });
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  let body: AdRevenueEstimateSettingsInput;
  try {
    body = (await request.json()) as AdRevenueEstimateSettingsInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await updateAdRevenueEstimateSettings(body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ settings: result.settings });
}
