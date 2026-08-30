"use server";

import { createClient } from "@/lib/data/server";
import { checkStaffPermission } from "@/lib/auth/staff-guards";

export type LedgerBackfillResult = {
  insertedCount: number;
  skippedExisting: number;
  skippedUnmapped: number;
  skippedZeroAmount: number;
};

/** Re-run transaction → ledger backfill (idempotent). Finance staff only. */
export async function runCreatorWalletLedgerBackfill(): Promise<{
  ok: boolean;
  error?: string;
  data?: LedgerBackfillResult;
}> {
  const auth = await checkStaffPermission("finance.payout.view");
  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  const db = await createClient();
  const { data, error } = await db.rpc(
    "backfill_creator_wallet_ledger_from_transactions"
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const parsed = row as Record<string, number> | null;

  return {
    ok: true,
    data: {
      insertedCount: Number(parsed?.inserted_count ?? 0),
      skippedExisting: Number(parsed?.skipped_existing ?? 0),
      skippedUnmapped: Number(parsed?.skipped_unmapped ?? 0),
      skippedZeroAmount: Number(parsed?.skipped_zero_amount ?? 0)
    }
  };
}
