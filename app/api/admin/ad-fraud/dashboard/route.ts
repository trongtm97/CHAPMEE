import { NextResponse } from "next/server";
import { getAdFraudDashboard } from "@/lib/ads/get-fraud-dashboard";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-fraud");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }
  const result = await getAdFraudDashboard();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ dashboard: result.dashboard });
}
