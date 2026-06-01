export type ChapterPricingSource =
  | "free_manual"
  | "paid_manual"
  | "auto_free_first_chapters"
  | "auto_paid_after_threshold";

export type StoryMonetizationSettings = {
  story_id: string;
  creator_user_id: string;
  monetization_enabled: boolean;
  full_access_enabled: boolean;
  full_access_price_coin: number | null;
  full_access_includes_future_chapters: boolean;
  full_access_note: string | null;
  auto_pricing_enabled: boolean;
  free_first_chapters_count: number;
  auto_paid_from_chapter: number | null;
  auto_price_coin: number | null;
  default_new_chapter_price_coin: number | null;
  updated_at: string;
};

export type StoryFullAccessUnlock = {
  id: string;
  user_id: string;
  story_id: string;
  creator_user_id: string;
  coin_amount: number;
  price_coin_snapshot: number;
  includes_future_chapters: boolean;
  transaction_id: string | null;
  status: "active" | "revoked";
  purchased_at: string;
  created_at: string;
};

export type StudioChapterMonetizationRow = {
  chapterId: string;
  episodeNumber: number;
  title: string;
  status: string;
  isPaid: boolean;
  priceCoin: number | null;
  pricingSource: ChapterPricingSource;
  monetizationOverride: boolean;
  updatedAt: string;
};

export type StudioStoryMonetizationDetail = StoryMonetizationSettings & {
  storyTitle: string;
  storySlug: string;
  storyStatus: string;
  totalChapterCount: number;
  paidChapterCount: number;
  revenueVnd: number;
  fullAccessPurchaseCount: number;
  chapterUnlockCount: number;
};
