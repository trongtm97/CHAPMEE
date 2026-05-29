"use server";

import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createCreatorPayoutAccountAction } from "@/lib/monetization/payouts";
import { maskAccountNumber, maskPhone } from "@/lib/finance/mask-payout-account";
import { logFinanceSecurityEvent } from "@/lib/finance/log-finance-security";
import type { PayoutMethod } from "@/types/payout";

export async function updatePayoutProfile(input: {
  method: PayoutMethod;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  walletPhone?: string;
  setDefault?: boolean;
}): Promise<{ ok: boolean; error?: string; accountId?: string }> {
  const { profile } = await getCurrentUser();
  if (!profile?.id) {
    return { ok: false, error: "Bạn cần đăng nhập." };
  }

  const bankMasked = input.bankAccountNumber
    ? maskAccountNumber(input.bankAccountNumber)
    : undefined;
  const walletMasked = input.walletPhone ? maskPhone(input.walletPhone) : undefined;

  const created = await createCreatorPayoutAccountAction({
    method: input.method,
    accountHolderName: input.accountHolderName,
    bankName: input.bankName,
    bankAccountNumberMasked: bankMasked,
    walletPhoneMasked: walletMasked,
    setDefault: input.setDefault ?? true
  });

  if (!created.ok || !created.data) {
    return { ok: false, error: created.error ?? "Không thể lưu thông tin nhận tiền." };
  }

  await logFinanceSecurityEvent({
    creatorUserId: profile.id,
    eventType: created.data.is_default
      ? "payout_profile_changed"
      : "payout_profile_created",
    metadata: { method: input.method, account_id: created.data.id }
  });

  return { ok: true, accountId: created.data.id };
}
