"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCreatorFinanceConfig } from "@/lib/finance/get-creator-finance-config";
import { verifyWithdrawalPin } from "@/lib/finance/verify-withdrawal-pin";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import { insertCreatorWalletLedgerEntry } from "@/lib/supabase/creator-finance";
import { requestPayoutAction } from "@/lib/monetization/payouts";
import { getCreatorWithdrawalSecurity } from "@/lib/supabase/creator-finance";
import { calculateCreatorBalance } from "@/lib/finance/calculate-creator-balance";
import type { PayoutMethod } from "@/types/payout";

export type CreateWithdrawalInput = {
  amountVnd: number;
  method: PayoutMethod;
  payoutAccountId: string;
  pin: string;
  creatorNote?: string;
};

function isLocked(lockedUntil: string | null): boolean {
  if (!lockedUntil) return false;
  return new Date(lockedUntil).getTime() > Date.now();
}

export async function createWithdrawalRequest(
  input: CreateWithdrawalInput
): Promise<{ ok: boolean; error?: string; requestId?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const config = await getCreatorFinanceConfig();

  if (!config.creatorMonetizationEnabled) {
    return { ok: false, error: "Kiếm tiền chưa được bật cho tài khoản của bạn." };
  }
  if (!config.withdrawalsEnabled) {
    return { ok: false, error: "Yêu cầu rút tiền hiện chưa được mở." };
  }

  const amount = Number(input.amountVnd);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Số tiền không hợp lệ." };
  }
  if (amount < config.minWithdrawAmountVnd) {
    return {
      ok: false,
      error: `Số tiền rút tối thiểu là ${config.minWithdrawAmountVnd.toLocaleString("vi-VN")} ₫.`
    };
  }

  const balance = await calculateCreatorBalance(profile.id);
  if (!balance.data || amount > balance.data.availableBalanceVnd) {
    return { ok: false, error: "Số dư có thể rút không đủ." };
  }

  if (!config.payoutMethodsEnabled.includes(input.method)) {
    return { ok: false, error: "Phương thức nhận tiền không được hỗ trợ." };
  }

  const security = await getCreatorWithdrawalSecurity(profile.id);
  if (config.withdrawalPinRequired) {
    if (!security.data?.pin_hash) {
      return { ok: false, error: "Vui lòng thiết lập mã PIN rút tiền trước." };
    }
    if (isLocked(security.data.locked_until)) {
      return {
        ok: false,
        error: "Mã PIN đang bị khóa tạm thời. Vui lòng thử lại sau."
      };
    }
    const pinCheck = await verifyWithdrawalPin(profile.id, input.pin);
    if (!pinCheck.ok) {
      return { ok: false, error: pinCheck.error };
    }
  }

  const payout = await requestPayoutAction({
    amountVnd: amount,
    method: input.method,
    payoutAccountId: input.payoutAccountId
  });

  if (!payout.ok || !payout.data) {
    return { ok: false, error: payout.error ?? "Không thể gửi yêu cầu rút tiền." };
  }

  const ledger = await insertCreatorWalletLedgerEntry({
    creatorUserId: profile.id,
    type: "withdrawal_hold",
    amountVnd: amount,
    direction: "debit",
    withdrawalRequestId: payout.data.id,
    transactionId: payout.data.transaction_id ?? null,
    sourceType: "payout_request",
    sourceId: payout.data.id,
    description: "Giữ số dư cho yêu cầu rút tiền",
    metadata: {
      method: input.method,
      creator_note: input.creatorNote ?? null,
      manual_review: config.withdrawalReviewRequired
    }
  });

  if (ledger.error) {
    return {
      ok: true,
      requestId: payout.data.id,
      error:
        "Yêu cầu đã gửi nhưng chưa ghi được sổ cái. Liên hệ hỗ trợ nếu số dư hiển thị chưa đúng."
    };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: "withdrawal_requested",
    metadata: {
      payout_request_id: payout.data.id,
      amount_vnd: amount,
      method: input.method
    }
  });

  return { ok: true, requestId: payout.data.id };
}
