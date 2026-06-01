import { NextResponse } from "next/server";
import { rebuildAdRevenueStats } from "@/lib/ads/rebuildAdRevenueStats";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

type RebuildBody = {
  from?: string;
  to?: string;
};

export async function POST(request: Request) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as RebuildBody;
  if (!body.from || !body.to) {
    return NextResponse.json({ error: "Thiếu from/to (YYYY-MM-DD)." }, { status: 400 });
  }

  const result = await rebuildAdRevenueStats({ from: body.from, to: body.to });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, warnings: result.warnings }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    dailyRows: result.dailyRows,
    monthlyUpserts: result.monthlyUpserts,
    warnings: result.warnings
  });
}
