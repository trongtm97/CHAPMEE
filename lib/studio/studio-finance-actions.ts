"use server";

import { changeWithdrawalPin, requestChangePinEmailCode, requestResetPinEmailCode, requestSetupPinEmailCode, resetWithdrawalPin, setWithdrawalPin } from "@/lib/finance/set-withdrawal-pin";
import { createWithdrawalRequest } from "@/lib/finance/create-withdrawal-request";
import { sendFinanceEmailCode } from "@/lib/finance/finance-email-code";
import {
  addBankAccount,
  confirmBankAccountEmail,
  removeBankAccount,
  resendBankAccountEmailCode,
  setDefaultBankAccount,
  updateBankAccount
} from "@/lib/finance/bank-account-actions";
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
  emailCode: string;
}) {
  return setWithdrawalPin(input);
}

export async function studioChangeWithdrawalPinAction(input: {
  currentPin: string;
  newPin: string;
  confirmPin: string;
  emailCode: string;
}) {
  return changeWithdrawalPin(input);
}

export async function studioResetWithdrawalPinAction(input: {
  emailCode: string;
  newPin: string;
  confirmPin: string;
}) {
  return resetWithdrawalPin(input);
}

export async function studioRequestFinanceEmailCodeAction(
  purpose:
    | "setup_pin"
    | "change_pin"
    | "reset_pin"
    | "verify_bank_account"
    | "change_bank_account"
) {
  if (purpose === "setup_pin") return requestSetupPinEmailCode();
  if (purpose === "change_pin") return requestChangePinEmailCode();
  if (purpose === "reset_pin") return requestResetPinEmailCode();
  return sendFinanceEmailCode({ purpose });
}

export async function studioAddBankAccountAction(input: {
  accountHolderName: string;
  bankName: string;
  bankAccountNumber: string;
  bankBranch?: string;
  confirmOwnership: boolean;
  setAsDefault?: boolean;
}) {
  return addBankAccount(input);
}

export async function studioUpdateBankAccountAction(input: {
  accountId: string;
  accountHolderName: string;
  bankName: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  confirmOwnership: boolean;
}) {
  return updateBankAccount(input);
}

export async function studioRemoveBankAccountAction(accountId: string) {
  return removeBankAccount(accountId);
}

export async function studioSetDefaultBankAccountAction(accountId: string) {
  return setDefaultBankAccount(accountId);
}

export async function studioResendBankEmailCodeAction() {
  return resendBankAccountEmailCode();
}

export async function studioConfirmBankAccountEmailAction(input: {
  code: string;
  accountId?: string;
}) {
  return confirmBankAccountEmail(input);
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

/** @deprecated use studioAddBankAccountAction / studioUpdateBankAccountAction at /studio/finance */
export async function studioUpdatePayoutProfileAction(_input: {
  method: PayoutMethod;
  accountHolderName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  walletPhone?: string;
}) {
  return {
    ok: false as const,
    error: "Vui lòng quản lý tài khoản nhận tiền tại mục Tài chính (/studio/finance)."
  };
}
