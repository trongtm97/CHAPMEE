"use server";

import { checkStaffPermission } from "@/lib/auth/staff-guards";
import {
  formatPayoutMasked,
  loadWithdrawalEnrichedContext
} from "@/lib/admin/withdrawals/load-withdrawal-context";
import { computeWithdrawalRiskLevel } from "@/lib/admin/withdrawals/compute-withdrawal-risk";
import {
  formatWithdrawalCode,
  matchesStatusFilter,
  withdrawalMethodLabel,
  withdrawalStatusLabel
} from "@/lib/admin/withdrawals/withdrawal-labels";
import type { AdminWithdrawalListRow, WithdrawalDashboardFilters } from "@/types/admin-withdrawal";
import type { PayoutRequest } from "@/types/payout";
function sortRows(rows: AdminWithdrawalListRow[], sort: WithdrawalDashboardFilters["sort"]) {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
      case "amount_desc":
        return b.amountVnd - a.amountVnd;
      case "amount_asc":
        return a.amountVnd - b.amountVnd;
      default:
        return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    }
  });
  return copy;
}

function matchesSearch(
  req: PayoutRequest,
  row: {
    displayName: string;
    username: string | null;
    email: string | null;
    studioName: string | null;
  },
  search: string
) {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  const code = formatWithdrawalCode(req.id).toLowerCase();
  const haystack = [
    code,
    req.id,
    row.displayName,
    row.username,
    row.email,
    row.studioName
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export async function listAdminWithdrawals(filters: WithdrawalDashboardFilters): Promise<{
  rows: AdminWithdrawalListRow[];
  total: number;
  error: string | null;
}> {
  const auth = await checkStaffPermission("finance.payout.view");
  if (!auth.ok) {
    return { rows: [], total: 0, error: auth.error };
  }

  const ctx = await loadWithdrawalEnrichedContext(500);
  if (ctx.error) {
    return { rows: [], total: 0, error: ctx.error };
  }

  const minAmount = filters.minAmount ? Number(filters.minAmount) : null;
  const maxAmount = filters.maxAmount ? Number(filters.maxAmount) : null;
  const startMs = filters.startDate ? new Date(filters.startDate).getTime() : null;
  const endMs = filters.endDate
    ? new Date(`${filters.endDate}T23:59:59.999`).getTime()
    : null;

  const filtered: AdminWithdrawalListRow[] = [];

  for (const req of ctx.requests) {
    const profile = ctx.profileByUserId.get(req.creator_user_id);
    const displayName =
      profile?.display_name ?? profile?.username ?? req.creator_user_id.slice(0, 8);
    const rowMeta = {
      displayName,
      username: profile?.username ?? null,
      email: ctx.emailByUserId.get(req.creator_user_id) ?? null,
      studioName: ctx.studioByUserId.get(req.creator_user_id) ?? null
    };

    if (!matchesStatusFilter(req.status, filters.status)) continue;
    if (filters.method !== "all" && req.method !== filters.method) continue;
    if (!matchesSearch(req, rowMeta, filters.search)) continue;

    const requestedMs = new Date(req.requested_at).getTime();
    if (startMs != null && requestedMs < startMs) continue;
    if (endMs != null && requestedMs > endMs) continue;
    if (minAmount != null && Number.isFinite(minAmount) && req.amount_vnd < minAmount) continue;
    if (maxAmount != null && Number.isFinite(maxAmount) && req.amount_vnd > maxAmount) continue;

    const feeVnd = ctx.feeByRequestId.get(req.id) ?? 0;
    const monetization = ctx.monetizationByUserId.get(req.creator_user_id);
    const otherActive = ctx.requests.filter(
      (r) => r.creator_user_id === req.creator_user_id && r.id !== req.id
    );

    const riskLevel = await computeWithdrawalRiskLevel({
      creatorUserId: req.creator_user_id,
      request: req,
      profileStatus: profile?.status ?? null,
      monetizationStatus: monetization?.status ?? null,
      monetizationEnabled: monetization?.monetization_enabled ?? false,
      ledgerMismatch: false,
      otherActiveRequests: otherActive,
      hasContentQualityWarning: false,
      hasOpenReport: false
    });

    if (filters.risk !== "all" && riskLevel !== filters.risk) continue;

    filtered.push({
      id: req.id,
      withdrawalCode: formatWithdrawalCode(req.id),
      creatorUserId: req.creator_user_id,
      displayName,
      username: rowMeta.username,
      email: rowMeta.email,
      avatarUrl: profile?.avatar_url ?? null,
      studioName: rowMeta.studioName,
      isVerified: Boolean(profile?.is_verified),
      hasBlueTick: Boolean(profile?.is_verified && profile?.verification_type),
      amountVnd: req.amount_vnd,
      feeVnd,
      netAmountVnd: Math.max(0, req.amount_vnd - feeVnd),
      method: req.method,
      methodLabel: withdrawalMethodLabel(req.method),
      payoutMasked: formatPayoutMasked(req.payout_account_snapshot),
      status: req.status,
      statusLabel: withdrawalStatusLabel(req.status),
      requestedAt: req.requested_at,
      riskLevel,
      lastProcessorLabel: req.reviewed_by
        ? (ctx.processorByUserId.get(req.reviewed_by) ?? null)
        : null
    });
  }

  const sortedRows = sortRows(filtered, filters.sort);
  const total = sortedRows.length;
  const from = (filters.page - 1) * filters.pageSize;
  const rows = sortedRows.slice(from, from + filters.pageSize);

  return { rows, total, error: null };
}
