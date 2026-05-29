"use server";

import { ADMIN_COIN_DANGER_CONFIRM_TEXT } from "@/lib/admin/coin-danger";
import { assertAnyPermission, assertPermission } from "@/lib/auth/require-permission";
import { getUserCoinLedger } from "@/lib/coins/get-user-coin-ledger";
import {
  exportAdminCoinAdjustmentCsv,
  getAdminCoinAdjustmentHistory,
  getAdminCoinDashboardMetrics,
  getUserCoinWalletDetail,
  searchUsersForCoinAdmin,
  validateBulkCoinLines
} from "@/lib/admin/coins";
import { bulkGrantCoinsAction } from "@/lib/admin/bulk-grant-coins";
import { grantCoinToUserAction } from "@/lib/admin/grant-coin-to-user";
import { debitCoinFromUserAction } from "@/lib/admin/debit-coin-from-user";
import { getAdminCoinLimits } from "@/lib/admin/coin-limits";
import type {
  AdminCoinAdjustInput,
  AdminCoinAdjustmentHistoryFilters,
  UserCoinLedgerType
} from "@/types/coins";

const COIN_VIEW_PERMISSIONS = [
  "finance.wallet.view",
  "finance.wallet.adjust",
  "wallet.transaction.view.all"
] as const;

export async function fetchCoinDashboardAction() {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);
  return getAdminCoinDashboardMetrics();
}

export async function fetchCoinLimitsAction() {
  await assertPermission("finance.wallet.adjust");
  return getAdminCoinLimits();
}

export async function searchCoinUsersAction(query: string) {
  return searchUsersForCoinAdmin({ query, page: 1, pageSize: 10 });
}

export async function fetchUserCoinAdminDataAction(
  userId: string,
  filterType: UserCoinLedgerType | "all" = "all"
) {
  await assertAnyPermission([...COIN_VIEW_PERMISSIONS]);

  const [wallet, ledger] = await Promise.all([
    getUserCoinWalletDetail(userId),
    getUserCoinLedger({ userId, limit: 10, type: filterType })
  ]);

  return {
    wallet: wallet.data,
    entries: ledger.entries,
    error: wallet.error ?? ledger.error
  };
}

export async function fetchCoinAdjustmentHistoryAction(
  filters: AdminCoinAdjustmentHistoryFilters
) {
  return getAdminCoinAdjustmentHistory(filters);
}

export async function validateBulkCoinLinesAction(raw: string) {
  return validateBulkCoinLines(raw);
}

export async function confirmBulkGrantCoinsAction(
  raw: string,
  dangerConfirmToken?: string | null
) {
  return bulkGrantCoinsAction(raw, dangerConfirmToken);
}

export async function exportCoinHistoryAction(
  filters: AdminCoinAdjustmentHistoryFilters
) {
  await assertAnyPermission([
    "finance.wallet.export",
    "finance.wallet.adjust",
    "wallet.transaction.view.all"
  ]);
  return exportAdminCoinAdjustmentCsv(filters);
}

export async function adjustCoinAction(input: AdminCoinAdjustInput) {
  if (!input.confirmedUser) {
    return { ok: false, error: "Cần xác nhận đã kiểm tra đúng user." };
  }

  const payload = {
    userId: input.userId,
    amount: input.amount,
    coinType: input.coinType,
    reason: input.reason,
    reasonCode: input.reasonCode,
    adminNote: input.adminNote,
    referenceId: input.referenceId,
    dangerConfirmToken: input.dangerConfirmToken
  };

  if (input.direction === "credit") {
    return grantCoinToUserAction(payload);
  }

  return debitCoinFromUserAction(payload);
}

export { ADMIN_COIN_DANGER_CONFIRM_TEXT };
