import {
  applyUserCoinLedgerRecord,
  getOrCreateUserWalletRecord
} from "@/lib/data/wallets";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import type { TransactionSource, TransactionType } from "@/types/transaction";
import type { CoinType, SpendRule, UserWallet } from "@/types/wallet";

type WalletResult<T> = { data: T | null; error: string | null };

function sanitizeAmount(amount: number) {
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

export async function getOrCreateUserWallet(
  userId: string
): Promise<WalletResult<UserWallet>> {
  return getOrCreateUserWalletRecord(userId);
}

export async function creditUserCoins(input: {
  userId: string;
  amount: number;
  coinType: CoinType;
  reason: TransactionType;
  source?: TransactionSource;
  metadata?: Record<string, unknown>;
  transactionCode?: string;
}) {
  const amount = sanitizeAmount(input.amount);
  if (amount <= 0) {
    return { data: null, error: "Amount must be greater than 0." };
  }

  return applyUserCoinLedgerRecord({
    userId: input.userId,
    transactionCode: input.transactionCode ?? buildTransactionCode("COINCR"),
    type: input.reason,
    source: input.source ?? "system",
    direction: "credit",
    amount,
    coinType: input.coinType,
    metadata: input.metadata ?? {}
  });
}

export async function debitUserCoins(input: {
  userId: string;
  amount: number;
  spendRule?: SpendRule;
  reason: TransactionType;
  source?: TransactionSource;
  metadata?: Record<string, unknown>;
  transactionCode?: string;
}) {
  const amount = sanitizeAmount(input.amount);
  if (amount <= 0) {
    return { data: null, error: "Amount must be greater than 0." };
  }

  return applyUserCoinLedgerRecord({
    userId: input.userId,
    transactionCode: input.transactionCode ?? buildTransactionCode("COINDB"),
    type: input.reason,
    source: input.source ?? "system",
    direction: "debit",
    amount,
    spendRule: input.spendRule ?? "bonus_first",
    metadata: input.metadata ?? {}
  });
}

export async function calculateWalletBalance(userId: string) {
  const wallet = await getOrCreateUserWallet(userId);
  if (!wallet.data) {
    return { data: null, error: wallet.error ?? "Could not calculate wallet." };
  }

  return {
    data: {
      ...wallet.data,
      total_coin_balance:
        wallet.data.paid_coin_balance +
        wallet.data.bonus_coin_balance +
        wallet.data.locked_coin_balance
    },
    error: null
  };
}
