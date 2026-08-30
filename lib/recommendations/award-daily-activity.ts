import "server-only";

import { getActivityDateKey } from "@/lib/recommendations/activity-date";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { earnRecommendationTickets } from "@/lib/recommendations/wallet";

export async function awardTicketsFromDailyActivity(input: {
  userId: string;
  activityDate?: string;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled || !config.enableDailyActivityTickets) {
    return { ok: true as const, skipped: true };
  }

  const activityDate = input.activityDate ?? getActivityDateKey();

  return earnRecommendationTickets({
    userId: input.userId,
    amount: config.ticketsPerDailyActivity,
    sourceType: "daily_activity",
    sourceId: activityDate,
    note: "Hoạt động hằng ngày"
  });
}

/** Award once per calendar day (VN) on first qualifying activity. */
export async function maybeAwardDailyActivityTickets(userId: string) {
  return awardTicketsFromDailyActivity({ userId });
}
