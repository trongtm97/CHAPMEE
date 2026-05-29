import { createClient } from "@/lib/supabase/server";
import type { CoinPack } from "@/types/payment";

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCoinPack(row: Record<string, unknown>): CoinPack {
  const baseCoinAmount = toNumber(row.base_coin_amount ?? row.coin_amount);
  const bonusCoinAmount = toNumber(row.bonus_coin_amount);
  const totalCoinAmount = toNumber(
    row.total_coin_amount ?? baseCoinAmount + bonusCoinAmount
  );
  const bonusPercent =
    baseCoinAmount > 0 ? Number(((bonusCoinAmount / baseCoinAmount) * 100).toFixed(2)) : 0;

  return {
    id: String(row.id),
    name: String(row.name),
    base_coin_amount: baseCoinAmount,
    bonus_coin_amount: bonusCoinAmount,
    total_coin_amount: totalCoinAmount,
    bonus_percent: toNumber(row.bonus_percent ?? bonusPercent),
    price_vnd: toNumber(row.price_vnd),
    currency: String(row.currency ?? "VND"),
    label: (row.label as string | null) ?? null,
    is_active: Boolean(row.is_active),
    sort_order: toNumber(row.sort_order),
    badge_text: (row.badge_text as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

export async function getActiveCoinPacks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coin_packs")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { data: [] as CoinPack[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapCoinPack),
    error: null
  };
}

export async function getCoinPacksForAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coin_packs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return { data: [] as CoinPack[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapCoinPack),
    error: null
  };
}

export async function getCoinPackById(packId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coin_packs")
    .select("*")
    .eq("id", packId)
    .maybeSingle();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Coin pack not found." };
  }

  return { data: mapCoinPack(data as Record<string, unknown>), error: null };
}

export async function upsertCoinPack(input: {
  id?: string;
  name: string;
  baseCoinAmount: number;
  bonusCoinAmount: number;
  priceVnd: number;
  currency?: string;
  label?: string | null;
  isActive: boolean;
  sortOrder: number;
  badgeText?: string | null;
}) {
  if (input.priceVnd <= 0) {
    return { data: null, error: "Price VND phải lớn hơn 0." };
  }
  if (input.baseCoinAmount <= 0) {
    return { data: null, error: "Base coin amount phải lớn hơn 0." };
  }
  if (input.bonusCoinAmount < 0) {
    return { data: null, error: "Bonus coin amount không được âm." };
  }
  if (input.priceVnd < 100000 && input.bonusCoinAmount > 0) {
    return {
      data: null,
      error: "Theo rule mặc định, gói dưới 100.000 VND không được có bonus."
    };
  }

  const bonusPercent = Number(
    ((input.bonusCoinAmount / input.baseCoinAmount) * 100).toFixed(2)
  );
  if (bonusPercent > 15) {
    return { data: null, error: "Bonus percent không được vượt quá 15%." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coin_packs")
    .upsert(
      {
        id: input.id,
        name: input.name,
        base_coin_amount: input.baseCoinAmount,
        bonus_coin_amount: input.bonusCoinAmount,
        total_coin_amount: input.baseCoinAmount + input.bonusCoinAmount,
        bonus_percent: bonusPercent,
        price_vnd: input.priceVnd,
        currency: input.currency ?? "VND",
        label: input.label ?? null,
        is_active: input.isActive,
        sort_order: input.sortOrder,
        badge_text: input.badgeText ?? null
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Could not save coin pack." };
  }

  return { data: mapCoinPack(data as Record<string, unknown>), error: null };
}
