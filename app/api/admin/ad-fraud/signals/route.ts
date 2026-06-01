import { NextResponse } from "next/server";
import { listAdFraudSignals } from "@/lib/ads/fraud-signals";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export async function GET(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-fraud");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listAdFraudSignals({
    status: searchParams.get("status") ?? undefined,
    severity: searchParams.get("severity") ?? undefined,
    rule_key: searchParams.get("rule_key") ?? undefined,
    month: searchParams.get("month") ?? undefined,
    author_id: searchParams.get("author_id") ?? undefined,
    limit: Number(searchParams.get("limit") ?? 100)
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ signals: result.signals });
}
