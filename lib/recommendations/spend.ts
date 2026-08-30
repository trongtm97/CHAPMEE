import "server-only";

import { sql } from "drizzle-orm";
import { ActionAccessError, assertActionAccess } from "@/lib/auth/assert-action-access";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { db } from "@/lib/db";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { getRecommendationTicketsConfig } from "@/lib/recommendations/config";
import {
  getRecommendationTicketBalance,
  spendRecommendationTickets
} from "@/lib/recommendations/wallet";
import { enforceRateLimit } from "@/lib/rate-limit";

export type RecommendStoryResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  ticketsSpent: number | null;
  newBalance: number | null;
  recommendationId: string | null;
};

export type StoryRecommendationSummary = {
  totalTickets: number;
  supporterCount: number;
};

export async function getStoryRecommendationSummary(
  storyId: string
): Promise<StoryRecommendationSummary> {
  try {
    const result = await db.execute(sql`
      select
        coalesce(sum(tickets_spent), 0)::int as total_tickets,
        count(distinct user_id)::int as supporter_count
      from public.story_recommendations
      where story_id = ${storyId}::uuid
        and status = 'active'
    `);
    const row = result.rows[0] as { total_tickets?: number; supporter_count?: number };
    return {
      totalTickets: Number(row?.total_tickets ?? 0),
      supporterCount: Number(row?.supporter_count ?? 0)
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { totalTickets: 0, supporterCount: 0 };
    }
    throw error;
  }
}

export async function spendTicketsForStoryRecommendation(
  storyId: string,
  tickets: number
): Promise<RecommendStoryResult> {
  const config = getRecommendationTicketsConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: "Tính năng Phiếu đề cử chưa mở.",
      loginRequired: false,
      ticketsSpent: null,
      newBalance: null,
      recommendationId: null
    };
  }

  const spendAmount = Math.trunc(tickets);
  if (spendAmount < config.minTicketsPerRecommendation) {
    return {
      ok: false,
      error: `Cần ít nhất ${config.minTicketsPerRecommendation} Phiếu đề cử.`,
      loginRequired: false,
      ticketsSpent: null,
      newBalance: null,
      recommendationId: null
    };
  }

  const { user } = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      error: null,
      loginRequired: true,
      ticketsSpent: null,
      newBalance: null,
      recommendationId: null
    };
  }

  try {
    await assertActionAccess("comment.create");
  } catch (error) {
    if (error instanceof ActionAccessError) {
      return {
        ok: false,
        error: error.message,
        loginRequired: false,
        ticketsSpent: null,
        newBalance: null,
        recommendationId: null
      };
    }
    throw error;
  }

  const rateLimit = await enforceRateLimit("story_boost", user.id);
  if (!rateLimit.allowed) {
    return {
      ok: false,
      error: "Thao tác quá nhanh. Thử lại sau.",
      loginRequired: false,
      ticketsSpent: null,
      newBalance: null,
      recommendationId: null
    };
  }

  try {
    const storyResult = await db.execute(sql`
      select id, status
      from public.stories
      where id = ${storyId}::uuid
      limit 1
    `);
    const story = storyResult.rows[0] as { id?: string; status?: string } | undefined;
    if (!story?.id || !["approved", "published"].includes(String(story.status))) {
      return {
        ok: false,
        error: "Truyện không khả dụng để đề cử.",
        loginRequired: false,
        ticketsSpent: null,
        newBalance: null,
        recommendationId: null
      };
    }
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        ok: false,
        error: "Không tìm thấy truyện.",
        loginRequired: false,
        ticketsSpent: null,
        newBalance: null,
        recommendationId: null
      };
    }
    throw error;
  }

  const balance = await getRecommendationTicketBalance(user.id);
  if (balance < spendAmount) {
    return {
      ok: false,
      error: "Không đủ Phiếu đề cử.",
      loginRequired: false,
      ticketsSpent: null,
      newBalance: balance,
      recommendationId: null
    };
  }

  const spent = await spendRecommendationTickets({
    userId: user.id,
    storyId,
    tickets: spendAmount
  });

  if (!spent.ok) {
    return {
      ok: false,
      error: spent.error ?? "Không thể đề cử.",
      loginRequired: false,
      ticketsSpent: null,
      newBalance: spent.balance,
      recommendationId: null
    };
  }

  const { maybeAwardDailyActivityTickets } = await import(
    "@/lib/recommendations/award-daily-activity"
  );
  await maybeAwardDailyActivityTickets(user.id);

  return {
    ok: true,
    error: null,
    loginRequired: false,
    ticketsSpent: spendAmount,
    newBalance: spent.balance,
    recommendationId: spent.recommendationId
  };
}
