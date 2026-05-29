export type VipBenefitKey =
  | "no_ads"
  | "monthly_coin_bonus"
  | "early_access_discount_percent"
  | "paid_chapter_discount_percent"
  | "vip_badge"
  | "exclusive_theme";

export type VipPlan = {
  id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  duration_days: number;
  coin_bonus_amount: number;
  benefits: Record<string, unknown> | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type UserSubscriptionStatus = "active" | "expired" | "cancelled" | "pending";

export type UserSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: UserSubscriptionStatus;
  started_at: string | null;
  expires_at: string | null;
  renewal_enabled: boolean;
  provider: string | null;
  provider_subscription_id: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  plan?: VipPlan | null;
};
