export type SupportTipStatus = "completed" | "refunded" | "reversed";

export type SupportTip = {
  id: string;
  request_id: string;
  from_user_id: string;
  to_creator_user_id: string;
  story_id: string | null;
  chapter_id: string | null;
  gift_id: string | null;
  coin_amount: number;
  paid_coin_amount: number;
  bonus_coin_amount: number;
  gross_value_vnd: number | null;
  creator_net_vnd: number;
  platform_fee_vnd: number;
  message: string | null;
  is_anonymous: boolean;
  status: SupportTipStatus;
  transaction_id: string;
  created_at: string;
};

export type SupporterRankingItem = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  total_coin: number;
  tip_count: number;
};
