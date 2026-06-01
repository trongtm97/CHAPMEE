import { NextResponse } from "next/server";
import {
  getAdRevenueReconciliation,
  updateAdRevenueReconciliation
} from "@/lib/ads/reconciliation";
import {
  requireFinanceSettingsUpdate,
  requireFinanceSettingsView
} from "@/lib/auth/require-permission";
import type { AdRevenueMonthlyReconciliationInput } from "@/types/ad-revenue-reconciliation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsView("/admin/ad-revenue-reconciliation");
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error }, { status: 403 });
  }
  const { id } = await context.params;
  const result = await getAdRevenueReconciliation(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json({ reconciliation: result.reconciliation });
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  let body: AdRevenueMonthlyReconciliationInput;
  try {
    body = (await request.json()) as AdRevenueMonthlyReconciliationInput;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const result = await updateAdRevenueReconciliation(id, body, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ reconciliation: result.reconciliation });
}
