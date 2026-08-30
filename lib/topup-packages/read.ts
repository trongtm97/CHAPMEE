/**
 * Coin top-up packages must be read from admin configuration/database only.
 * Do not hard-code packages in frontend user components.
 */
import type { CoinPack } from "@/types/payment";
import type { TopupPackagePublic } from "@/types/topup-package";
import { getActiveCoinPacks, getCoinPackById } from "@/lib/data/coin-packs";

export function mapCoinPackToTopupPackagePublic(pack: CoinPack): TopupPackagePublic {
  return {
    id: pack.id,
    name: pack.name,
    amount_vnd: pack.amount_vnd,
    base_coin: pack.base_coin_amount,
    bonus_percent: pack.bonus_percent,
    bonus_coin: pack.bonus_coin_amount,
    total_coin: pack.total_coin_amount,
    badge_text: pack.badge_text,
    description: pack.description,
    is_recommended: pack.is_recommended,
    sort_order: pack.sort_order
  };
}

function sortTopupPackages(packages: TopupPackagePublic[]) {
  return [...packages].sort(
    (a, b) => a.sort_order - b.sort_order || a.amount_vnd - b.amount_vnd
  );
}

/** Active packages only, sorted by sort_order then amount_vnd. */
export async function getActiveTopupPackages(): Promise<{
  data: TopupPackagePublic[];
  error: string | null;
}> {
  const result = await getActiveCoinPacks();
  if (result.error) {
    return { data: [], error: result.error };
  }
  return {
    data: sortTopupPackages(result.data.map(mapCoinPackToTopupPackagePublic)),
    error: null
  };
}

/** Load package by id. Pass `requireActive: true` before creating payment. */
export async function getTopupPackageById(
  packageId: string,
  options?: { requireActive?: boolean }
): Promise<{
  data: TopupPackagePublic | null;
  error: string | null;
}> {
  const result = await getCoinPackById(packageId);
  if (!result.data) {
    return { data: null, error: result.error ?? "Gói nạp không tồn tại." };
  }

  if (options?.requireActive && !result.data.is_active) {
    return { data: null, error: "Gói nạp đang tắt hoặc không khả dụng." };
  }

  return {
    data: mapCoinPackToTopupPackagePublic(result.data),
    error: null
  };
}
