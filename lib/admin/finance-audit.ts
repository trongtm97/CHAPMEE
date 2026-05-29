"use server";

import { logAdminAction } from "@/lib/audit/log-admin-action";
import { getCurrentAuthContext } from "@/lib/auth/permissions";

export type FinanceAuditAction =
  | "finance_dashboard_view"
  | "finance_report_export"
  | "finance_transaction_opened"
  | "finance_payout_queue_opened"
  | "finance_refund_queue_opened"
  | "finance_risk_dashboard_opened"
  | "payment_reconciliation_opened";

export async function logFinanceAudit(
  action: FinanceAuditAction,
  metadata?: Record<string, unknown>
) {
  const context = await getCurrentAuthContext();
  if (!context?.userId) return { ok: false };

  return logAdminAction({
    actorId: context.userId,
    action,
    targetType: "finance_dashboard",
    metadata: metadata ?? {}
  });
}
