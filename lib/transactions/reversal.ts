import { createTransaction } from "@/lib/transactions/ledger";
import { getTransactionById } from "@/lib/data/transactions";
import { findProcessedRefundByOriginalTransaction } from "@/lib/data/refunds";
import type { TransactionRow } from "@/types/transaction";

function isAlreadyReversed(original: TransactionRow) {
  return Boolean(original.metadata?.reversed_by_transaction_id);
}

export async function reverseTransaction(
  originalTransactionId: string,
  reason: string,
  metadata?: Record<string, unknown>
) {
  const original = await getTransactionById(originalTransactionId);
  if (!original.data) {
    return { data: null, error: original.error ?? "Original transaction not found." };
  }
  if (isAlreadyReversed(original.data)) {
    return { data: null, error: "Transaction đã được reverse trước đó." };
  }
  const duplicated = await findProcessedRefundByOriginalTransaction(originalTransactionId);
  if (duplicated) {
    return { data: null, error: "Refund đã được xử lý cho transaction này." };
  }

  const tx = await createTransaction({
    type: "reversal",
    direction: original.data.direction === "credit" ? "debit" : "credit",
    source: "refund",
    status: "completed",
    userId: original.data.user_id,
    creatorUserId: original.data.creator_user_id,
    storyId: original.data.story_id,
    chapterId: original.data.chapter_id,
    coinAmount: original.data.coin_amount,
    paidCoinAmount: original.data.paid_coin_amount,
    bonusCoinAmount: original.data.bonus_coin_amount,
    moneyAmountVnd: original.data.money_amount_vnd,
    metadata: {
      original_transaction_id: originalTransactionId,
      reversal_reason: reason,
      ...(metadata ?? {})
    }
  });
  if (!tx.data) return tx;
  return { data: tx.data, error: null };
}

export async function createRefundTransaction(input: {
  originalTransactionId: string;
  userId?: string | null;
  amountVnd?: number | null;
  coinAmount?: number | null;
  metadata?: Record<string, unknown>;
}) {
  return createTransaction({
    type: "refund",
    direction: "debit",
    source: "refund",
    status: "completed",
    userId: input.userId ?? null,
    moneyAmountVnd: input.amountVnd ?? null,
    coinAmount: input.coinAmount ?? null,
    metadata: {
      original_transaction_id: input.originalTransactionId,
      ...(input.metadata ?? {})
    }
  });
}

export async function createChargebackTransaction(input: {
  originalTransactionId: string;
  userId?: string | null;
  amountVnd: number;
  metadata?: Record<string, unknown>;
}) {
  return createTransaction({
    type: "reversal",
    direction: "debit",
    source: "refund",
    status: "completed",
    userId: input.userId ?? null,
    moneyAmountVnd: input.amountVnd,
    metadata: {
      original_transaction_id: input.originalTransactionId,
      reason: "chargeback",
      ...(input.metadata ?? {})
    }
  });
}
