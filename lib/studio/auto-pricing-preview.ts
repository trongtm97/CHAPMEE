import type { StoryMonetizationSettings } from "@/types/story-monetization";

export function buildAutoPricingPreview(settings: Pick<
  StoryMonetizationSettings,
  | "auto_pricing_enabled"
  | "free_first_chapters_count"
  | "auto_paid_from_chapter"
  | "auto_price_coin"
>) {
  const freeCount = Math.max(0, settings.free_first_chapters_count);
  const paidFrom = settings.auto_paid_from_chapter ?? freeCount + 1;
  const price = settings.auto_price_coin ?? 0;

  if (!settings.auto_pricing_enabled) {
    return "Tự động thu phí đang tắt.";
  }

  if (freeCount <= 0) {
    return `Từ chương ${paidFrom} trở đi: ${price} coin/chương.`;
  }

  return `Chương 1–${freeCount} miễn phí. Từ chương ${paidFrom} trở đi: ${price} coin/chương.`;
}
