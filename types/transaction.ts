export type TransactionStatus =
  | "pending"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled"
  | "reversed";

export type TransactionDirection = "credit" | "debit" | "transfer";

export type TransactionSource =
  | "system"
  | "payment"
  | "sepay"
  | "tip"
  | "unlock"
  | "vip"
  | "gift"
  | "admin"
  | "bonus"
  | "rewarded_ad_coin"
  | "payout"
  | "refund"
  | "sponsor";

export type TransactionType =
  | "coin_purchase"
  | "bonus_coin_grant"
  | "admin_coin_adjustment"
  | "chapter_unlock"
  | "story_unlock"
  | "author_tip"
  | "virtual_gift"
  | "vip_subscription"
  | "fan_club_subscription"
  | "rewarded_ad_coin"
  | "creator_revenue_share"
  | "creator_bonus"
  | "platform_fee"
  | "refund"
  | "payout_request"
  | "payout_completed"
  | "fraud_hold"
  | "reversal"
  | "sponsored_campaign_revenue";

export type TransactionRow = {
  id: string;
  transaction_code: string;
  user_id: string | null;
  creator_user_id: string | null;
  story_id: string | null;
  chapter_id: string | null;
  type: TransactionType;
  direction: TransactionDirection;
  coin_amount: number | null;
  paid_coin_amount: number | null;
  bonus_coin_amount: number | null;
  money_amount_vnd: number | null;
  gross_amount_vnd: number | null;
  provider_fee_vnd: number | null;
  store_fee_vnd: number | null;
  net_amount_vnd: number | null;
  payment_channel: string | null;
  provider: string | null;
  provider_reference: string | null;
  module_type: string | null;
  revenue_basis: "gross" | "net";
  fee_percent_applied: number | null;
  platform_fee_vnd: number | null;
  creator_percent: number | null;
  creator_gross_vnd: number | null;
  creator_net_vnd: number | null;
  platform_net_vnd: number | null;
  creator_withdrawable_vnd: number | null;
  creator_non_withdrawable_vnd: number | null;
  currency: string;
  status: TransactionStatus;
  source: TransactionSource;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
