export type ChapterEarlyAccessSetting = {
  id: string;
  chapter_id: string;
  story_id: string;
  creator_user_id: string;
  enabled: boolean;
  coin_price: number | null;
  free_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EarlyAccessUnlock = {
  id: string;
  user_id: string;
  chapter_id: string;
  story_id: string;
  creator_user_id: string;
  coin_amount: number;
  paid_coin_amount: number;
  bonus_coin_amount: number;
  transaction_id: string;
  unlocked_at: string;
  created_at: string;
};
