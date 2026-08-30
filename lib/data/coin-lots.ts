import { createClient } from "@/lib/data/server";
import type { CoinLotAllocation } from "@/types/coin-lot";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapAllocation(row: Record<string, unknown>): CoinLotAllocation {
  return {
    lot_id: (row.lot_id as string | null) ?? null,
    paid_coin_amount: toNumber(row.paid_coin_amount),
    bonus_coin_amount: toNumber(row.bonus_coin_amount),
    payment_channel: (row.payment_channel as CoinLotAllocation["payment_channel"]) ?? null,
    provider: (row.provider as CoinLotAllocation["provider"]) ?? null,
    net_ratio:
      row.net_ratio == null ? null : toNumber(row.net_ratio),
    source_type: (row.source_type as CoinLotAllocation["source_type"]) ?? "unknown",
    gross_amount_vnd: row.gross_amount_vnd == null ? null : toNumber(row.gross_amount_vnd),
    provider_fee_vnd:
      row.provider_fee_vnd == null ? null : toNumber(row.provider_fee_vnd),
    store_fee_vnd: row.store_fee_vnd == null ? null : toNumber(row.store_fee_vnd),
    net_amount_vnd: row.net_amount_vnd == null ? null : toNumber(row.net_amount_vnd),
    fee_percent_applied:
      row.fee_percent_applied == null ? null : toNumber(row.fee_percent_applied),
    coin_to_vnd_rate:
      row.coin_to_vnd_rate == null ? null : toNumber(row.coin_to_vnd_rate),
    estimated: Boolean(row.estimated)
  };
}

export async function allocateCoinSpendFifo(input: {
  userId: string;
  amountCoin: number;
  spendRule?: "bonus_first" | "paid_first";
  applyDeduction?: boolean;
}) {
  const db = await createClient();
  const { data, error } = await db.rpc("allocate_coin_spend_fifo", {
    input_user_id: input.userId,
    input_amount_coin: input.amountCoin,
    input_spend_rule: input.spendRule ?? "bonus_first",
    input_apply_deduction: input.applyDeduction ?? false
  });
  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not allocate coin lots." };
  }

  const payload = data as { allocations?: Array<Record<string, unknown>>; paid_coin_amount?: number; bonus_coin_amount?: number };
  return {
    data: {
      allocations: (payload.allocations ?? []).map(mapAllocation),
      paidCoinAmount: toNumber(payload.paid_coin_amount),
      bonusCoinAmount: toNumber(payload.bonus_coin_amount)
    },
    error: null
  };
}
