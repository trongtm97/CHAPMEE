"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { validateAdminCoinAmount, walletSnapshotFromBalances } from "@/lib/admin/coin-adjust-helpers";
import {
  assertNotSelfFinanceAction,
  requireWalletAdjustAccess
} from "@/lib/auth/finance-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { getOrCreateUserWalletRecord } from "@/lib/supabase/wallets";
import { debitUserCoins } from "@/lib/wallets/user-wallet";
import type { AdminCoinDebitInput, AdminCoinReasonCode } from "@/types/coins";

export async function debitCoinFromUserAction(input: AdminCoinDebitInput) {
  const access = await requireWalletAdjustAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền trừ coin." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const reasonCode = (input.reasonCode ?? "thu_hoi_gian_lan") as AdminCoinReasonCode;
  const validation = await validateAdminCoinAmount({
    amount: input.amount,
    coinType: input.coinType,
    direction: "debit",
    reasonCode,
    adminNote: input.adminNote,
    dangerConfirmToken: input.dangerConfirmToken
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const selfCheck = await assertNotSelfFinanceAction(input.userId, "trừ coin");
  if (!selfCheck.ok) {
    return { ok: false, error: selfCheck.error };
  }

  const walletBefore = await getOrCreateUserWalletRecord(input.userId);
  if (!walletBefore.data) {
    return { ok: false, error: "Không tải được ví user." };
  }

  const beforePaid = walletBefore.data.paid_coin_balance;
  const beforeBonus = walletBefore.data.bonus_coin_balance;
  const available =
    input.coinType === "paid" ? beforePaid : beforeBonus;

  if (!input.allowNegative && available < input.amount) {
    const label = input.coinType === "paid" ? "Coin nạp" : "Coin thưởng";
    return {
      ok: false,
      error: `${label} không đủ (hiện có ${available.toLocaleString("vi-VN")} coin).`
    };
  }

  const result = await debitUserCoins({
    userId: input.userId,
    amount: input.amount,
    spendRule: input.coinType === "paid" ? "paid_first" : "bonus_first",
    reason: "admin_coin_adjustment",
    source: "admin",
    metadata: {
      ledger_type: "admin_debit",
      coin_type: input.coinType,
      reason: validation.reason,
      reason_code: reasonCode,
      admin_note: input.adminNote?.trim() || null,
      reference_id: input.referenceId?.trim() || null,
      admin_id: ctx.userId,
      balance_before_paid: beforePaid,
      balance_before_bonus: beforeBonus,
      balance_after_paid:
        input.coinType === "paid"
          ? Math.max(0, beforePaid - input.amount)
          : beforePaid,
      balance_after_bonus:
        input.coinType === "bonus"
          ? Math.max(0, beforeBonus - input.amount)
          : beforeBonus
    }
  });

  if (result.error || !result.data) {
    console.error("[debitCoinFromUserAction]", result.error);
    const message = result.error?.includes("insufficient")
      ? "Số dư không đủ để trừ coin."
      : "Không thể trừ coin. Vui lòng thử lại.";
    return { ok: false, error: message };
  }

  const walletAfter = await getOrCreateUserWalletRecord(input.userId);

  await createAdminAuditLog({
    action: "coin_debit",
    targetType: "user",
    targetId: input.userId,
    note: input.adminNote?.trim() || null,
    before: {
      ...walletSnapshotFromBalances(beforePaid, beforeBonus),
      balance_before_paid: beforePaid,
      balance_before_bonus: beforeBonus
    },
    after: {
      transaction_id: result.data.id,
      action_type: "coin_debit",
      coin_type: input.coinType,
      amount: input.amount,
      balance_after_paid: walletAfter.data?.paid_coin_balance ?? beforePaid,
      balance_after_bonus: walletAfter.data?.bonus_coin_balance ?? beforeBonus,
      reason: validation.reason,
      ...(walletAfter.data
        ? walletSnapshotFromBalances(
            walletAfter.data.paid_coin_balance,
            walletAfter.data.bonus_coin_balance
          )
        : {})
    },
    metadata: {
      admin_id: ctx.userId,
      admin_user_id: ctx.userId,
      target_user_id: input.userId,
      reason_code: reasonCode,
      reference_id: input.referenceId?.trim() || null
    }
  });

  revalidatePath("/admin/coins");
  revalidatePath("/admin/audit");
  revalidatePath("/wallet");

  return { ok: true, error: null, transactionId: result.data.id };
}
