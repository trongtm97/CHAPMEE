import type { PaymentChannel, PaymentProviderKey } from "@/types/payment";

export type CoinLotSourceType =
  | "coin_purchase"
  | "bonus"
  | "rewarded_ad"
  | "referral"
  | "admin_grant"
  | "test";

export type UserCoinLot = {
  id: string;
  user_id: string;
  source_transaction_id: string | null;
  source_type: CoinLotSourceType;
  payment_channel: PaymentChannel | null;
  provider: PaymentProviderKey | null;
  paid_coin_remaining: number;
  bonus_coin_remaining: number;
  original_paid_coin_amount: number;
  original_bonus_coin_amount: number;
  gross_amount_vnd: number | null;
  provider_fee_vnd: number | null;
  store_fee_vnd: number | null;
  net_amount_vnd: number | null;
  fee_percent_applied: number | null;
  coin_to_vnd_rate: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CoinLotAllocation = {
  lot_id: string | null;
  paid_coin_amount: number;
  bonus_coin_amount: number;
  payment_channel: PaymentChannel | null;
  provider: PaymentProviderKey | null;
  net_ratio: number | null;
  source_type: CoinLotSourceType | "unknown";
  gross_amount_vnd: number | null;
  provider_fee_vnd: number | null;
  store_fee_vnd: number | null;
  net_amount_vnd: number | null;
  fee_percent_applied: number | null;
  coin_to_vnd_rate: number | null;
  estimated: boolean;
};
