"use server";

import {
  createCreatorPayoutAccountAction,
  requestPayoutAction
} from "@/lib/monetization/payouts";
import type { PayoutMethod } from "@/types/payout";

export type StudioWithdrawalInput = {
  amountVnd: number;
  method: PayoutMethod;
  payoutAccountId?: string;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumberMasked?: string;
  walletPhoneMasked?: string;
  note?: string;
};

export async function createStudioWithdrawalRequest(
  input: StudioWithdrawalInput
): Promise<{ ok: boolean; error?: string }> {
  let payoutAccountId = input.payoutAccountId?.trim() ?? "";

  if (!payoutAccountId) {
    const created = await createCreatorPayoutAccountAction({
      method: input.method,
      accountHolderName: input.accountHolderName,
      bankName: input.bankName,
      bankAccountNumberMasked: input.bankAccountNumberMasked,
      walletPhoneMasked: input.walletPhoneMasked,
      setDefault: true
    });

    if (!created.ok || !created.data) {
      return {
        ok: false,
        error: created.error ?? "Không thể lưu thông tin nhận tiền."
      };
    }

    payoutAccountId = created.data.id;
  }

  const result = await requestPayoutAction({
    amountVnd: input.amountVnd,
    method: input.method,
    payoutAccountId
  });

  if (!result.ok) {
    return { ok: false, error: result.error ?? "Không thể gửi yêu cầu rút tiền." };
  }

  return { ok: true };
}
