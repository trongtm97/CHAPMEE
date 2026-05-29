import {
  applyCreatorRevenueLedgerRecord,
  getOrCreateCreatorWalletRecord
} from "@/lib/supabase/wallets";
import { buildTransactionCode } from "@/lib/transactions/ledger";
import type { TransactionSource, TransactionType } from "@/types/transaction";
import type { CreatorRevenueStatus, CreatorWallet } from "@/types/wallet";

type WalletResult<T> = { data: T | null; error: string | null };

function sanitizeAmount(amount: number) {
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0;
}

export async function getOrCreateCreatorWallet(
  userId: string
): Promise<WalletResult<CreatorWallet>> {
  return getOrCreateCreatorWalletRecord(userId);
}

export async function creditCreatorRevenue(input: {
  creatorUserId: string;
  amountVnd: number;
  status?: CreatorRevenueStatus;
  reason?: TransactionType;
  source?: TransactionSource;
  metadata?: Record<string, unknown>;
  userId?: string | null;
  storyId?: string | null;
  chapterId?: string | null;
  transactionCode?: string;
}) {
  const amountVnd = sanitizeAmount(input.amountVnd);
  if (amountVnd <= 0) {
    return { data: null, error: "Amount must be greater than 0." };
  }

  return applyCreatorRevenueLedgerRecord({
    creatorUserId: input.creatorUserId,
    transactionCode: input.transactionCode ?? buildTransactionCode("CRREV"),
    type: input.reason ?? "creator_revenue_share",
    source: input.source ?? "system",
    amountVnd,
    revenueStatus: input.status ?? "pending",
    metadata: input.metadata ?? {},
    userId: input.userId ?? null,
    storyId: input.storyId ?? null,
    chapterId: input.chapterId ?? null
  });
}
