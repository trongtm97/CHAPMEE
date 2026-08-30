"use server";

import { revalidatePath } from "next/cache";
import { createAdminAuditLog } from "@/lib/admin/create-audit-log";
import { validateAdminCoinAmount, walletSnapshotFromBalances } from "@/lib/admin/coin-adjust-helpers";
import {
  assertNotSelfFinanceAction,
  requireWalletAdjustAccess
} from "@/lib/auth/finance-guards";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { getOrCreateUserWalletRecord } from "@/lib/data/wallets";
import { creditUserCoins } from "@/lib/wallets/user-wallet";
import type { AdminCoinGrantInput, AdminCoinReasonCode } from "@/types/coins";

export async function grantCoinToUserAction(input: AdminCoinGrantInput) {
  const access = await requireWalletAdjustAccess();
  if (!access.ok) {
    return { ok: false, error: access.error ?? "Không có quyền cấp coin." };
  }

  const ctx = await getCurrentAuthContext();
  if (!ctx?.userId) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const reasonCode = (input.reasonCode ?? "khac") as AdminCoinReasonCode;
  const validation = await validateAdminCoinAmount({
    amount: input.amount,
    coinType: input.coinType,
    direction: "credit",
    reasonCode,
    adminNote: input.adminNote,
    dangerConfirmToken: input.dangerConfirmToken,
    isBulk: input.bulkAdminAdjustment
  });

  if (!validation.ok) {
    return { ok: false, error: validation.error };
  }

  const selfCheck = await assertNotSelfFinanceAction(input.userId, "tặng coin");
  if (!selfCheck.ok) {
    return { ok: false, error: selfCheck.error };
  }

  const walletBefore = await getOrCreateUserWalletRecord(input.userId);
  if (!walletBefore.data) {
    return { ok: false, error: "Không tải được ví user." };
  }

  const beforePaid = walletBefore.data.paid_coin_balance;
  const beforeBonus = walletBefore.data.bonus_coin_balance;

  const result = await creditUserCoins({
    userId: input.userId,
    amount: input.amount,
    coinType: input.coinType,
    reason: "admin_coin_adjustment",
    source: "admin",
    metadata: {
      ledger_type: "admin_grant",
      coin_type: input.coinType,
      reason: validation.reason,
      reason_code: reasonCode,
      admin_note: input.adminNote?.trim() || null,
      reference_id: input.referenceId?.trim() || null,
      admin_id: ctx.userId,
      bulk_admin_adjustment: input.bulkAdminAdjustment === true,
      balance_before_paid: beforePaid,
      balance_before_bonus: beforeBonus,
      balance_after_paid:
        input.coinType === "paid" ? beforePaid + input.amount : beforePaid,
      balance_after_bonus:
        input.coinType === "bonus" ? beforeBonus + input.amount : beforeBonus
    }
  });

  if (result.error || !result.data) {
    console.error("[grantCoinToUserAction]", result.error);
    return { ok: false, error: "Không thể cộng coin. Vui lòng thử lại." };
  }

  const walletAfter = await getOrCreateUserWalletRecord(input.userId);

  await createAdminAuditLog({
    action: "coin_grant",
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
      action_type: "coin_grant",
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
