import { getMonetizationConfig } from "@/lib/monetization/config";
import { getCreatorEligibilityStats } from "@/lib/supabase/creator-stats";
import type { CreatorEligibilityResult } from "@/types/creator-monetization";

export async function calculateCreatorEligibility(
  userId: string
): Promise<CreatorEligibilityResult> {
  const [config, statsResult] = await Promise.all([
    getMonetizationConfig({ includePrivate: true }),
    getCreatorEligibilityStats(userId)
  ]);

  const stats = statsResult.data;
  const reasons: string[] = [];

  const minFollowers = Number(config.settings["creator_monetization.min_followers"] ?? 0);
  const minReads = Number(config.settings["creator_monetization.min_reads"] ?? 0);
  const minChapters = Number(config.settings["creator_monetization.min_chapters"] ?? 0);

  if (stats.followers < minFollowers) {
    reasons.push(`Cần ít nhất ${minFollowers} followers.`);
  }
  if (stats.total_reads < minReads) {
    reasons.push(`Cần ít nhất ${minReads} lượt đọc.`);
  }
  if (stats.chapters_count < minChapters) {
    reasons.push(`Cần ít nhất ${minChapters} chapter được duyệt.`);
  }
  if (stats.violations_count > 0) {
    reasons.push("Tài khoản có vi phạm/moderation flags cần review.");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    stats
  };
}
