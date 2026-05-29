"use server";

import { changeWithdrawalPin, setWithdrawalPin } from "@/lib/finance/set-withdrawal-pin";
import { createWithdrawalRequest } from "@/lib/finance/create-withdrawal-request";
import { updatePayoutProfile } from "@/lib/finance/update-payout-profile";
import { getCreatorTransactionDetail } from "@/lib/finance/get-creator-transaction-detail";
import { createClient } from "@/lib/supabase/server";
import type { PayoutMethod } from "@/types/payout";

async function getCurrentCreatorUserId() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function studioSetWithdrawalPinAction(input: {
  pin: string;
  confirmPin: string;
}) {
  return setWithdrawalPin(input);
}

export async function studioChangeWithdrawalPinAction(input: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
}) {
  return changeWithdrawalPin(input);
}

export async function studioUpdatePayoutProfileAction(input: {
  method: PayoutMethod;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  walletPhone?: string;
}) {
  return updatePayoutProfile(input);
}

export async function studioFinanceEarningDetailAction(earningTransactionId: string) {
  const creatorUserId = await getCurrentCreatorUserId();
  if (!creatorUserId) {
    return { data: null, error: "Bạn cần đăng nhập." };
  }
  return getCreatorTransactionDetail({ creatorUserId, earningTransactionId });
}

export async function studioFinanceWithdrawalAction(input: {
  amountVnd: number;
  method: PayoutMethod;
  payoutAccountId: string;
  pin: string;
  creatorNote?: string;
}) {
  return createWithdrawalRequest(input);
}
