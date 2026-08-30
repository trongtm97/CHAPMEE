import { randomUUID } from "crypto";
import {
  createTransaction as createTransactionRecord,
  updateTransactionStatus
} from "@/lib/data/transactions";
import type {
  TransactionDirection,
  TransactionRow,
  TransactionSource,
  TransactionStatus,
  TransactionType
} from "@/types/transaction";

export function buildTransactionCode(prefix = "TXN") {
  const stamp = Date.now().toString(36).toUpperCase();
  const nonce = randomUUID().slice(0, 8).toUpperCase();
  return `${prefix}-${stamp}-${nonce}`;
}

export async function createTransaction(input: {
  transactionCode?: string;
  type: TransactionType;
  direction: TransactionDirection;
  source: TransactionSource;
  status?: TransactionStatus;
  userId?: string | null;
  creatorUserId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  coinAmount?: number | null;
  paidCoinAmount?: number | null;
  bonusCoinAmount?: number | null;
  moneyAmountVnd?: number | null;
  grossAmountVnd?: number | null;
  providerFeeVnd?: number | null;
  storeFeeVnd?: number | null;
  netAmountVnd?: number | null;
  paymentChannel?: string | null;
  provider?: string | null;
  providerReference?: string | null;
  moduleType?: string | null;
  revenueBasis?: "gross" | "net";
  feePercentApplied?: number | null;
  platformFeeVnd?: number | null;
  creatorPercent?: number | null;
  creatorGrossVnd?: number | null;
  creatorNetVnd?: number | null;
  platformNetVnd?: number | null;
  creatorWithdrawableVnd?: number | null;
  creatorNonWithdrawableVnd?: number | null;
  metadata?: Record<string, unknown>;
}) {
  return createTransactionRecord({
    ...input,
    transactionCode: input.transactionCode ?? buildTransactionCode()
  });
}

export async function completeTransaction(transactionId: string) {
  return updateTransactionStatus(transactionId, "completed");
}

export async function failTransaction(transactionId: string) {
  return updateTransactionStatus(transactionId, "failed");
}

export async function markTransaction(
  transactionId: string,
  status: TransactionStatus
) {
  return updateTransactionStatus(transactionId, status);
}

export function getTransactionDisplayAmount(transaction: TransactionRow) {
  if (transaction.coin_amount != null) {
    return `${transaction.coin_amount} coin`;
  }

  if (transaction.money_amount_vnd != null) {
    return `${transaction.money_amount_vnd.toLocaleString("vi-VN")} VND`;
  }

  return "-";
}
