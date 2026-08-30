"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getCreatorFinanceConfig } from "@/lib/finance/get-creator-finance-config";
import { resolveStudioFinanceEligibility } from "@/lib/finance/finance-eligibility";
import { verifyWithdrawalPin } from "@/lib/finance/verify-withdrawal-pin";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import { insertCreatorWalletLedgerEntry } from "@/lib/data/creator-finance";
import { requestPayoutAction } from "@/lib/monetization/payouts";
import { getCreatorWithdrawalSecurity } from "@/lib/data/creator-finance";
import { calculateCreatorBalance } from "@/lib/finance/calculate-creator-balance";
import { getCreatorAccessStatus } from "@/lib/creator-access";
import { getFinanceIdentityStatus } from "@/lib/finance/get-finance-identity-status";
import { mapBankAccountViews } from "@/lib/finance/map-bank-account-view";
import { getCreatorPayoutAccountById, listCreatorPayoutAccounts } from "@/lib/data/payouts";
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

  const [creatorAccess, balance, security, payoutAccounts, identity] = await Promise.all([
    getCreatorAccessStatus(profile.id, {
      minWithdrawAmountVnd: config.minWithdrawAmountVnd,
      availableBalanceVnd: 0
    }),
    calculateCreatorBalance(profile.id),
    getCreatorWithdrawalSecurity(profile.id),
    listCreatorPayoutAccounts(profile.id),
    getFinanceIdentityStatus(profile.id)
  ]);

  const bankAccounts = mapBankAccountViews(payoutAccounts.data ?? [], identity);
  const selectedView = bankAccounts.find((a) => a.id === input.payoutAccountId);

  const pinLocked = isLocked(security.data?.locked_until ?? null);
  const eligibility = resolveStudioFinanceEligibility({
    config,
    creatorAccessWithdrawalEnabled: creatorAccess.withdrawalEnabled,
    creatorAccessWithdrawalDisabledReason: creatorAccess.withdrawalDisabledReason,
    identity,
    bankAccounts,
    pinConfigured: Boolean(security.data?.pin_hash),
    pinLocked,
    availableBalanceVnd: balance.data?.availableBalanceVnd ?? 0
  });

  if (!eligibility.canWithdraw) {
    return {
      ok: false,
      error: eligibility.primaryBlockReason ?? "Chưa đủ điều kiện rút tiền."
    };
  }

  if (!selectedView?.canUseForWithdrawal) {
    const account = await getCreatorPayoutAccountById(input.payoutAccountId, profile.id);
    if (!account.data) {
      return { ok: false, error: "Tài khoản nhận tiền không hợp lệ." };
    }
    if (selectedView?.accountStatus === "locked_24h") {
      return {
        ok: false,
        error: "Tài khoản này đang bị khóa rút 24h sau khi thay đổi."
      };
    }
    if (selectedView?.identityNameMatchStatus === "mismatched") {
      return {
        ok: false,
        error: "Tên chủ tài khoản không khớp với hồ sơ xác thực."
      };
    }
    return { ok: false, error: "Tài khoản nhận tiền chưa sẵn sàng để rút." };
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

  const balanceData = balance.data;
  if (!balanceData || amount > balanceData.availableBalanceVnd) {
    return { ok: false, error: "Số dư có thể rút không đủ." };
  }

  if (!config.payoutMethodsEnabled.includes(input.method)) {
    return { ok: false, error: "Phương thức nhận tiền không được hỗ trợ." };
  }

  if (config.withdrawalPinRequired) {
    if (!security.data?.pin_hash) {
      return { ok: false, error: "Vui lòng thiết lập mã PIN rút tiền trước." };
    }
    if (pinLocked) {
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
