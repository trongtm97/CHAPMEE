import type { CoinPack } from "@/types/payment";

/** Coin top-up package (stored in `coin_packs`). */
export type CoinTopupPackage = CoinPack & {
  description: string | null;
  is_recommended: boolean;
  amount_vnd: number;
  created_by: string | null;
  updated_by: string | null;
};

export type CoinTopupPackageFilter = "all" | "active" | "inactive" | "recommended";

export type CoinTopupPackageAuditLog = {
  id: string;
  package_id: string | null;
  actor_id: string | null;
  action: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
};

export type TopupPackageFormInput = {
  id?: string;
  name: string;
  amountVnd: number;
  bonusPercent: number;
  badgeText?: string | null;
  description?: string | null;
  isRecommended: boolean;
  isActive: boolean;
  sortOrder: number;
  confirmHighBonus?: boolean;
};

export type CalculatedTopupCoin = {
  baseCoin: number;
  bonusCoin: number;
  totalCoin: number;
  bonusPercent: number;
};

/** Public-facing package fields for user top-up UI (read from DB only). */
export type TopupPackagePublic = {
  id: string;
  name: string;
  amount_vnd: number;
  base_coin: number;
  bonus_percent: number;
  bonus_coin: number;
  total_coin: number;
  badge_text: string | null;
  description: string | null;
  is_recommended: boolean;
  sort_order: number;
};

/** Immutable snapshot stored on checkout/transaction at purchase time. */
export type TopupPackagePaymentSnapshot = {
  package_id: string;
  package_name: string;
  amount_vnd: number;
  base_coin: number;
  bonus_percent: number;
  bonus_coin: number;
  total_coin: number;
};

export type ValidateTopupPackageForPaymentResult =
  | { ok: true; snapshot: TopupPackagePaymentSnapshot }
  | { ok: false; error: string };
