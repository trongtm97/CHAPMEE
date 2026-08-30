import "server-only";

import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { getRecommendationTicketBalance } from "@/lib/recommendations/wallet";
import { getStoryRecommendationSummary } from "@/lib/recommendations/spend";

export type StoryRecommendationContext = {
  enabled: boolean;
  balance: number;
  totalTicketsReceived: number;
  supporterCount: number;
  minTickets: number;
};

export async function getStoryRecommendationContext(input: {
  storyId: string;
  userId?: string | null;
}): Promise<StoryRecommendationContext> {
  const config = getRecommendationTicketsConfig();
  const summary = await getStoryRecommendationSummary(input.storyId);
  const balance = input.userId ? await getRecommendationTicketBalance(input.userId) : 0;

  return {
    enabled: config.enabled,
    balance,
    totalTicketsReceived: summary.totalTickets,
    supporterCount: summary.supporterCount,
    minTickets: config.minTicketsPerRecommendation
  };
}
