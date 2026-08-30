import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import { earnRecommendationTickets } from "@/lib/recommendations/wallet";

async function countChapterCompletionAwards(userId: string, storyId: string) {
  try {
    const result = await db.execute(sql`
      select count(*)::int as total
      from public.recommendation_ticket_ledger
      where user_id = ${userId}::uuid
        and story_id = ${storyId}::uuid
        and source_type = 'chapter_completion'
        and type = 'earn'
    `);
    return Number((result.rows[0] as { total?: number })?.total ?? 0);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function awardTicketsFromChapterCompletion(input: {
  userId: string;
  chapterId: string;
  storyId: string;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled || !config.enableChapterCompletionTickets) {
    return { ok: true as const, skipped: true };
  }

  const result = await earnRecommendationTickets({
    userId: input.userId,
    amount: config.ticketsPerCompletedChapter,
    sourceType: "chapter_completion",
    sourceId: input.chapterId,
    storyId: input.storyId,
    chapterId: input.chapterId
  });

  if (result.ok && !result.alreadyAwarded && config.enableStoryReadingMilestoneTickets) {
    await awardTicketsFromStoryMilestone({
      userId: input.userId,
      storyId: input.storyId
    });
  }

  const { maybeAwardDailyActivityTickets } = await import(
    "@/lib/recommendations/award-daily-activity"
  );
  await maybeAwardDailyActivityTickets(input.userId);

  return result;
}

export async function awardTicketsFromStoryMilestone(input: {
  userId: string;
  storyId: string;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled || !config.enableStoryReadingMilestoneTickets) {
    return { ok: true as const, skipped: true };
  }

  const completedCount = await countChapterCompletionAwards(input.userId, input.storyId);
  if (completedCount < config.storyMilestoneChapterCount) {
    return { ok: true as const, skipped: true, reason: "milestone_not_reached" as const };
  }

  return earnRecommendationTickets({
    userId: input.userId,
    amount: config.ticketsPerStoryMilestone,
    sourceType: "story_reading_milestone",
    sourceId: input.storyId,
    storyId: input.storyId,
    note: `Mốc ${config.storyMilestoneChapterCount} chương`
  });
}

export async function maybeAwardTicketsForReadingProgress(input: {
  userId: string;
  storyId: string;
  chapterId: string;
  progressPercent: number;
}) {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled) {
    return;
  }

  if (input.progressPercent < config.chapterCompletionProgressThreshold) {
    return;
  }

  await awardTicketsFromChapterCompletion({
    userId: input.userId,
    chapterId: input.chapterId,
    storyId: input.storyId
  });
}
