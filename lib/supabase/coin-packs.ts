import { createClient } from "@/lib/supabase/server";
import { calculateTopupCoin } from "@/lib/topup-packages/calculate";
import type { CoinPack } from "@/types/payment";
import type { CoinTopupPackage, TopupPackageFormInput } from "@/types/topup-package";

const TOPUP_AMOUNT_STEP = 1000;

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapCoinPack(row: Record<string, unknown>): CoinPack {
  const priceVnd = toNumber(row.price_vnd);
  const baseCoinAmount = toNumber(row.base_coin_amount ?? row.coin_amount);
  const bonusCoinAmount = toNumber(row.bonus_coin_amount);
  const totalCoinAmount = toNumber(
    row.total_coin_amount ?? baseCoinAmount + bonusCoinAmount
  );
  const bonusPercent =
    row.bonus_percent != null
      ? toNumber(row.bonus_percent)
      : baseCoinAmount > 0
        ? Number(((bonusCoinAmount / baseCoinAmount) * 100).toFixed(2))
        : 0;

  return {
    id: String(row.id),
    name: String(row.name),
    base_coin_amount: baseCoinAmount,
    bonus_coin_amount: bonusCoinAmount,
    total_coin_amount: totalCoinAmount,
    bonus_percent: bonusPercent,
    amount_vnd: toNumber(row.amount_vnd ?? priceVnd),
    price_vnd: priceVnd,
    currency: String(row.currency ?? "VND"),
    label: (row.label as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    is_active: Boolean(row.is_active),
    is_recommended: Boolean(row.is_recommended),
    sort_order: toNumber(row.sort_order),
    badge_text: (row.badge_text as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    updated_by: (row.updated_by as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at)
  };
}

function mapTopupPackage(row: Record<string, unknown>): CoinTopupPackage {
  return mapCoinPack(row);
}

export function snapshotPackage(pkg: CoinPack | null) {
  if (!pkg) return null;
  return {
    id: pkg.id,
    name: pkg.name,
    amount_vnd: pkg.amount_vnd,
    base_coin: pkg.base_coin_amount,
    bonus_percent: pkg.bonus_percent,
    bonus_coin: pkg.bonus_coin_amount,
    total_coin: pkg.total_coin_amount,
    is_active: pkg.is_active,
    is_recommended: pkg.is_recommended,
    sort_order: pkg.sort_order,
    badge_text: pkg.badge_text,
    description: pkg.description
  };
}

function duplicateAmountOffset(packages: CoinTopupPackage[], baseAmount: number) {
  let offset = TOPUP_AMOUNT_STEP;
  while (packages.some((pkg) => pkg.is_active && pkg.amount_vnd === baseAmount + offset)) {
    offset += TOPUP_AMOUNT_STEP;
  }
  return offset;
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
  const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapCoinPack);
  mapped.sort((a, b) => a.sort_order - b.sort_order || a.amount_vnd - b.amount_vnd);
  return {
    data: mapped,
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

  if (error) return { data: [] as CoinTopupPackage[], error: error.message };
  return {
    data: ((data ?? []) as Record<string, unknown>[]).map(mapTopupPackage),
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

export async function saveTopupPackage(
  input: TopupPackageFormInput & {
    exchangeRateVnd: number;
    actorId: string;
  }
) {
  const calculated = calculateTopupCoin(
    input.amountVnd,
    input.bonusPercent,
    input.exchangeRateVnd
  );

  const supabase = await createClient();
  const payload = {
    id: input.id,
    name: input.name.trim(),
    price_vnd: input.amountVnd,
    base_coin_amount: calculated.baseCoin,
    bonus_coin_amount: calculated.bonusCoin,
    total_coin_amount: calculated.totalCoin,
    bonus_percent: calculated.bonusPercent,
    coin_amount: calculated.totalCoin,
    currency: "VND",
    label: input.name.trim(),
    badge_text: input.badgeText?.trim() || null,
    description: input.description?.trim() || null,
    is_active: input.isActive,
    is_recommended: input.isRecommended,
    sort_order: input.sortOrder,
    updated_by: input.actorId,
    ...(input.id ? {} : { created_by: input.actorId })
  };

  const { data, error } = await supabase
    .from("coin_packs")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Không lưu được gói nạp." };
  }

  return { data: mapTopupPackage(data as Record<string, unknown>), error: null };
}

export async function toggleTopupPackageActive(
  packId: string,
  isActive: boolean,
  actorId: string
) {
  const existing = await getCoinPackById(packId);
  if (!existing.data) {
    return { data: null, error: existing.error ?? "Gói nạp không tồn tại.", previous: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("coin_packs")
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", packId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      data: null,
      error: error?.message ?? "Không cập nhật được trạng thái.",
      previous: existing.data
    };
  }

  return {
    data: mapTopupPackage(data as Record<string, unknown>),
    error: null,
    previous: existing.data
  };
}

export async function deleteTopupPackage(packId: string) {
  const existing = await getCoinPackById(packId);
  if (!existing.data) {
    return { ok: false, error: existing.error ?? "Gói nạp không tồn tại.", previous: null };
  }

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("checkout_sessions")
    .select("id", { count: "exact", head: true })
    .eq("coin_pack_id", packId);

  if (countError) {
    return { ok: false, error: countError.message, previous: existing.data };
  }

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: "Gói đã có giao dịch. Chỉ có thể tắt, không thể xóa.",
      previous: existing.data
    };
  }

  const { error } = await supabase.from("coin_packs").delete().eq("id", packId);
  if (error) {
    return { ok: false, error: error.message, previous: existing.data };
  }

  return { ok: true, error: null, previous: existing.data };
}

export async function duplicateTopupPackage(
  packId: string,
  actorId: string,
  exchangeRateVnd: number
) {
  const existing = await getCoinPackById(packId);
  if (!existing.data) {
    return { data: null, error: existing.error ?? "Gói nạp không tồn tại." };
  }

  const source = existing.data;
  const all = await getCoinPacksForAdmin();
  const maxSort = all.data.reduce((max, pkg) => Math.max(max, pkg.sort_order), 0);
  const newAmount =
    source.amount_vnd + duplicateAmountOffset(all.data, source.amount_vnd);

  return saveTopupPackage({
    name: `${source.name} (bản sao)`,
    amountVnd: newAmount,
    bonusPercent: source.bonus_percent,
    badgeText: source.badge_text,
    description: source.description,
    isRecommended: false,
    isActive: false,
    sortOrder: maxSort + 1,
    exchangeRateVnd,
    actorId
  });
}

export async function reorderTopupPackages(orderedIds: string[], actorId: string) {
  const supabase = await createClient();
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("coin_packs")
        .update({ sort_order: index + 1, updated_by: actorId })
        .eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return { ok: false, error: failed.error.message };
  }

  return { ok: true, error: null };
}

/** @deprecated Use saveTopupPackage via admin actions. */
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

  const bonusPercent = Number(
    ((input.bonusCoinAmount / input.baseCoinAmount) * 100).toFixed(2)
  );

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
