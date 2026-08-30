import { shouldBlockPayout } from "@/lib/risk/risk-engine";
import { listOpenHighRiskEventsByCreator } from "@/lib/data/risk";
import type { PayoutRequest, PayoutRequestStatus } from "@/types/payout";
import type { WithdrawalRiskLevel } from "@/types/admin-withdrawal";

function isActivePayoutStatus(status: PayoutRequestStatus) {
  return ["requested", "under_review", "approved", "processing"].includes(status);
}

export async function computeWithdrawalRiskLevel(input: {
  creatorUserId: string;
  request: PayoutRequest;
  profileStatus: string | null;
  monetizationStatus: string | null;
  monetizationEnabled: boolean;
  ledgerMismatch: boolean;
  otherActiveRequests: PayoutRequest[];
  hasContentQualityWarning: boolean;
  hasOpenReport: boolean;
}): Promise<WithdrawalRiskLevel> {
  const blocked = await shouldBlockPayout(input.creatorUserId);
  const openRisk = await listOpenHighRiskEventsByCreator(input.creatorUserId);

  if (
    blocked ||
    (openRisk.data ?? []).length > 0 ||
    input.profileStatus === "banned" ||
    input.profileStatus === "suspended" ||
    input.hasOpenReport
  ) {
    return "high";
  }

  const duplicateActive = input.otherActiveRequests.some(
    (r) => r.id !== input.request.id && isActivePayoutStatus(r.status)
  );

  if (
    duplicateActive ||
    input.monetizationStatus === "suspended" ||
    !input.monetizationEnabled ||
    input.ledgerMismatch ||
    input.hasContentQualityWarning ||
    input.request.status === "under_review"
  ) {
    return "warning";
  }

  if (input.request.risk_level === "high") return "high";
  if (input.request.risk_level === "warning") return "warning";
  return "normal";
}
