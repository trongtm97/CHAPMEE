import { createClient } from "@/lib/supabase/server";
import { getOrCreateUserWalletRecord } from "@/lib/supabase/wallets";
import type { UserCoinBalanceSummary } from "@/types/coins";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getUserCoinBalance(
  userId: string
): Promise<{ data: UserCoinBalanceSummary | null; error: string | null }> {
  const supabase = await createClient();

  const [walletResult, ledgerResult] = await Promise.all([
    getOrCreateUserWalletRecord(userId),
    supabase.rpc("get_user_coin_ledger_balance", { input_user_id: userId })
  ]);

  const wallet = walletResult.data;
  const ledgerRow = Array.isArray(ledgerResult.data)
    ? ledgerResult.data[0]
    : ledgerResult.data;

  if (ledgerResult.error && !ledgerRow) {
    if (!wallet) {
      return {
        data: null,
        error: ledgerResult.error.message ?? walletResult.error ?? "Không tải được số dư."
      };
    }
  }

  const totalCredit = toNumber(
    (ledgerRow as Record<string, unknown> | undefined)?.total_credit
  );
  const totalDebit = toNumber(
    (ledgerRow as Record<string, unknown> | undefined)?.total_debit
  );
  const balance = toNumber((ledgerRow as Record<string, unknown> | undefined)?.balance);
  const paidCredit = toNumber(
    (ledgerRow as Record<string, unknown> | undefined)?.paid_credit
  );
  const bonusCredit = toNumber(
    (ledgerRow as Record<string, unknown> | undefined)?.bonus_credit
  );

  const walletPaid = wallet?.paid_coin_balance ?? 0;
  const walletBonus = wallet?.bonus_coin_balance ?? 0;

  return {
    data: {
      totalCredit,
      totalDebit,
      balance: ledgerRow ? balance : walletPaid + walletBonus,
      paidCredit,
      bonusCredit,
      walletPaid,
      walletBonus,
      walletTotal: walletPaid + walletBonus
    },
    error: null
  };
}
