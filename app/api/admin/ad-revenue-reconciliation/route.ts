import { NextResponse } from "next/server";
import {
  createAdRevenueReconciliation,
  listAdRevenueReconciliations
} from "@/lib/ads/reconciliation";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdRevenueMonthlyReconciliationInput } from "@/types/ad-revenue-reconciliation";

export async function GET() {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-reconciliation");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }
  const result = await listAdRevenueReconciliations();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ reconciliations: result.reconciliations });
}

export async function POST(request: Request) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  let body: AdRevenueMonthlyReconciliationInput;
  try {
    body = (await request.json()) as AdRevenueMonthlyReconciliationInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = await createAdRevenueReconciliation(body, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ reconciliation: result.reconciliation });
}
