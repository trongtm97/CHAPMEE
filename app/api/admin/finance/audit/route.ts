import { NextResponse } from "next/server";
import { logFinanceAudit, type FinanceAuditAction } from "@/lib/admin/finance-audit";
import { getCurrentAuthContext } from "@/lib/auth/permissions";

const ALLOWED: FinanceAuditAction[] = [
  "finance_transaction_opened",
  "finance_payout_queue_opened",
  "finance_refund_queue_opened",
  "finance_risk_dashboard_opened",
  "payment_reconciliation_opened"
];

export async function POST(request: Request) {
  const context = await getCurrentAuthContext();
  if (!context?.permissions.includes("finance.dashboard.view")) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { action?: string; metadata?: Record<string, unknown> };
  const action = body.action as FinanceAuditAction;
  if (!action || !ALLOWED.includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }

  await logFinanceAudit(action, body.metadata);
  return NextResponse.json({ ok: true });
}
