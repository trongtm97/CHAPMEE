import { NextResponse } from "next/server";
import { listAdFraudSignalsForPolicyAdmin } from "@/lib/creator-ad-revenue/list-fraud-signals-admin";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-policy");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listAdFraudSignalsForPolicyAdmin({
    limit: Number(searchParams.get("limit") ?? 40),
    status: searchParams.get("status") ?? undefined
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ signals: result.signals });
}
