export type ChapterMonetizationSetting = {
  id: string;
  chapter_id: string;
  story_id: string;
  creator_user_id: string;
  is_paid: boolean;
  coin_price: number | null;
  free_preview_enabled: boolean;
  free_preview_percent: number | null;
  free_preview_chars: number | null;
  created_at: string;
  updated_at: string;
};

export type ChapterUnlock = {
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
