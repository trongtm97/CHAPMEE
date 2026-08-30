import "server-only";

import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { earnRecommendationTickets } from "@/lib/recommendations/wallet";

export async function awardTicketsFromValidComment(input: {
  userId: string;
  commentId: string;
  storyId: string;
  chapterId?: string | null;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled || !config.enableCommentTickets) {
    return { ok: true as const, skipped: true };
  }

  return earnRecommendationTickets({
    userId: input.userId,
    amount: config.ticketsPerValidComment,
    sourceType: "valid_comment",
    sourceId: input.commentId,
    storyId: input.storyId,
    chapterId: input.chapterId ?? null
  });
}

export async function maybeAwardTicketsForStoryComment(input: {
  userId: string;
  commentId: string;
  storyId: string;
  chapterId?: string | null;
  spamSuspected: boolean;
}) {
  if (input.spamSuspected) {
    return { ok: true as const, skipped: true, reason: "spam" as const };
  }

  const award = await awardTicketsFromValidComment({
    userId: input.userId,
    commentId: input.commentId,
    storyId: input.storyId,
    chapterId: input.chapterId
  });

  const { maybeAwardDailyActivityTickets } = await import(
    "@/lib/recommendations/award-daily-activity"
  );
  await maybeAwardDailyActivityTickets(input.userId);

  return award;
}
