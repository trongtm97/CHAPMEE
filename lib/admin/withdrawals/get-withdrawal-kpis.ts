"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import { loadWithdrawalEnrichedContext } from "@/lib/admin/withdrawals/load-withdrawal-context";
import { computeWithdrawalRiskLevel } from "@/lib/admin/withdrawals/compute-withdrawal-risk";
import { matchesStatusFilter } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { WithdrawalKpiSummary } from "@/types/admin-withdrawal";
import type { PayoutRequestStatus } from "@/types/payout";

function countByUiStatus(requests: { status: PayoutRequestStatus }[], ui: string) {
  return requests.filter((r) => matchesStatusFilter(r.status, ui as never)).length;
}

export async function getWithdrawalKpis(options?: {
  startDate?: string;
  endDate?: string;
}): Promise<{ data: WithdrawalKpiSummary; error: string | null }> {
  const auth = await checkStaffPermission("finance.payout.view");
  if (!auth.ok) {
    return {
      data: emptyKpis(),
      error: auth.error
    };
  }

  const ctx = await loadWithdrawalEnrichedContext(500);
  if (ctx.error) {
    return { data: emptyKpis(), error: ctx.error };
  }

  const startMs = options?.startDate ? new Date(options.startDate).getTime() : null;
  const endMs = options?.endDate
    ? new Date(`${options.endDate}T23:59:59.999`).getTime()
    : null;

  let pendingAmountVnd = 0;
  let paidAmountInPeriodVnd = 0;
  const waitingCreators = new Set<string>();
  let riskAlertCount = 0;

  for (const req of ctx.requests) {
    if (matchesStatusFilter(req.status, "pending")) {
      pendingAmountVnd += req.amount_vnd;
      waitingCreators.add(req.creator_user_id);
    }

    if (req.status === "completed") {
      const paidMs = new Date(req.paid_at ?? req.completed_at ?? req.updated_at).getTime();
      if (startMs == null || paidMs >= startMs) {
        if (endMs == null || paidMs <= endMs) {
          paidAmountInPeriodVnd += req.amount_vnd;
        }
      }
    }

    const profile = ctx.profileByUserId.get(req.creator_user_id);
    const monetization = ctx.monetizationByUserId.get(req.creator_user_id);
    const risk = await computeWithdrawalRiskLevel({
      creatorUserId: req.creator_user_id,
      request: req,
      profileStatus: profile?.status ?? null,
      monetizationStatus: monetization?.status ?? null,
      monetizationEnabled: monetization?.monetization_enabled ?? false,
      ledgerMismatch: false,
      otherActiveRequests: ctx.requests.filter(
        (r) => r.creator_user_id === req.creator_user_id && r.id !== req.id
      ),
      hasContentQualityWarning: false,
      hasOpenReport: false
    });

    const isActiveQueue =
      matchesStatusFilter(req.status, "pending") ||
      matchesStatusFilter(req.status, "approved") ||
      matchesStatusFilter(req.status, "processing");
    if (risk !== "normal" && isActiveQueue) {
      riskAlertCount += 1;
    }
  }

  return {
    data: {
      pendingCount: countByUiStatus(ctx.requests, "pending"),
      approvedCount: countByUiStatus(ctx.requests, "approved"),
      processingCount: countByUiStatus(ctx.requests, "processing"),
      paidCount: countByUiStatus(ctx.requests, "paid"),
      rejectedCount: countByUiStatus(ctx.requests, "rejected"),
      failedCount: countByUiStatus(ctx.requests, "failed"),
      pendingAmountVnd,
      paidAmountInPeriodVnd,
      creatorsWaitingCount: waitingCreators.size,
      riskAlertCount
    },
    error: null
  };
}

function emptyKpis(): WithdrawalKpiSummary {
  return {
    pendingCount: 0,
    approvedCount: 0,
    processingCount: 0,
    paidCount: 0,
    rejectedCount: 0,
    failedCount: 0,
    pendingAmountVnd: 0,
    paidAmountInPeriodVnd: 0,
    creatorsWaitingCount: 0,
    riskAlertCount: 0
  };
}
