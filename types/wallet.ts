export type UserWallet = {
  id: string;
  user_id: string;
  paid_coin_balance: number;
  bonus_coin_balance: number;
  locked_coin_balance: number;
  total_spent_coin: number;
  total_received_coin: number;
  created_at: string;
  updated_at: string;
};

export type CreatorWallet = {
  id: string;
  user_id: string;
  pending_revenue_vnd: number;
  available_revenue_vnd: number;
  locked_revenue_vnd: number;
  total_earned_vnd: number;
  total_withdrawn_vnd: number;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type SpendRule = "bonus_first" | "paid_first";
export type CoinType = "paid" | "bonus";
export type CreatorRevenueStatus = "pending" | "available" | "locked";
