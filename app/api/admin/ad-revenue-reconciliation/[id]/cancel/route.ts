import { NextResponse } from "next/server";
import { cancelAdRevenueReconciliation } from "@/lib/ads/reconciliation";
import { requireFinanceSettingsUpdate } from "@/lib/auth/require-permission";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const guard = await requireFinanceSettingsUpdate();
  if (!guard.ok || !guard.context) {
    return NextResponse.json({ error: guard.error ?? "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const result = await cancelAdRevenueReconciliation(id, guard.context.userId);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ reconciliation: result.reconciliation });
}
