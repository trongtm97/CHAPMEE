/**
 * Recommendation ticket (Phiếu đề cử) rules — MVP defaults.
 * TODO: Move recommendation ticket earning rules to admin monetization/ranking settings later.
 */

export type RecommendationTicketSourceType =
  | "coin_topup"
  | "chapter_completion"
  | "story_reading_milestone"
  | "valid_comment"
  | "daily_activity"
  | "admin_bonus"
  | "story_recommendation";

export type RecommendationTicketsConfig = {
  enabled: boolean;
  ticketsPerPaidCoin: number;
  ticketsPerCompletedChapter: number;
  enableTopupBonusTickets: boolean;
  enableChapterCompletionTickets: boolean;
  enableStoryReadingMilestoneTickets: boolean;
  enableCommentTickets: boolean;
  enableDailyActivityTickets: boolean;
  storyMilestoneChapterCount: number;
  ticketsPerStoryMilestone: number;
  ticketsPerValidComment: number;
  ticketsPerDailyActivity: number;
  minTicketsPerRecommendation: number;
  allowMultipleRecommendationsPerStory: boolean;
  showPublicExplanation: boolean;
  /** Chapter progress % treated as "completed" for earning. */
  chapterCompletionProgressThreshold: number;
};

export const RECOMMENDATION_TICKETS_CONFIG: RecommendationTicketsConfig = {
  enabled: true,
  ticketsPerPaidCoin: 1,
  ticketsPerCompletedChapter: 1,
  enableTopupBonusTickets: true,
  enableChapterCompletionTickets: true,
  enableStoryReadingMilestoneTickets: true,
  enableCommentTickets: true,
  enableDailyActivityTickets: true,
  storyMilestoneChapterCount: 3,
  ticketsPerStoryMilestone: 3,
  ticketsPerValidComment: 1,
  ticketsPerDailyActivity: 1,
  minTicketsPerRecommendation: 1,
  allowMultipleRecommendationsPerStory: true,
  showPublicExplanation: true,
  chapterCompletionProgressThreshold: 95
};

export function getRecommendationTicketsConfig(): RecommendationTicketsConfig {
  return RECOMMENDATION_TICKETS_CONFIG;
}

export function formatTicketsForPackage(totalCoin: number): number {
  return Math.max(0, Math.trunc(totalCoin));
}
