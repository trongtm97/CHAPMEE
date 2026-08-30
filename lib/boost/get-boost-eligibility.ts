import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getBoostSettings } from "@/lib/boost/boost-settings";
import { getStoryBoostSummary } from "@/lib/boost/refresh-boost-daily-stats";
import { getUserRewardPointsBalance } from "@/lib/boost/reward-points";
import { canViewPublicStory } from "@/lib/visibility/contentVisibility";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { StoryBoostEligibility } from "@/types/story-boost";
import { loadStoryOriginPolicy } from "@/lib/content-origin/load-story-origin-policy";

async function getDailyBoostPoints(input: {
  userId?: string;
  storyId?: string;
}) {
  try {
    if (input.userId) {
      const result = await db.execute(sql`
        select coalesce(sum(boost_points), 0)::int as total
        from public.story_boosts
        where user_id = ${input.userId}::uuid
          and decay_group = current_date
          and engagement_source = 'user'
          and is_counted_in_ranking = true
          and status = 'completed'
      `);
      return Number((result.rows[0] as { total?: number })?.total ?? 0);
    }

    if (input.storyId) {
      const result = await db.execute(sql`
        select coalesce(sum(boost_points), 0)::int as total
        from public.story_boosts
        where story_id = ${input.storyId}::uuid
          and decay_group = current_date
          and engagement_source = 'user'
          and is_counted_in_ranking = true
          and status = 'completed'
      `);
      return Number((result.rows[0] as { total?: number })?.total ?? 0);
    }

    return 0;
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return 0;
    }
    throw error;
  }
}

export async function getStoryBoostEligibility(input: {
  storyId: string;
  userId?: string | null;
}): Promise<StoryBoostEligibility> {
  const originPolicy = await loadStoryOriginPolicy(input.storyId);
  const settings = await getBoostSettings();
  const balance = input.userId ? await getUserRewardPointsBalance(input.userId) : 0;
  const summary = await getStoryBoostSummary(input.storyId);

  const base: StoryBoostEligibility = {
    enabled: settings.enabled,
    canBoost: false,
    reason: null,
    balance,
    pointsPerUnit: settings.pointsPerUnit,
    boostPointsPerUnit: settings.boostPointsPerUnit,
    userDailyRemaining: settings.userDailyCap,
    storyDailyRemaining: settings.storyDailyCap,
    weeklyBoostPoints: Math.round(summary.totalBoostPointsWeek),
    weeklyUniqueBoosters: summary.uniqueBoostersWeek
  };

  if (!settings.enabled) {
    return { ...base, reason: "Tính năng đề cử chưa mở." };
  }

  if (!settings.rewardPointBoostEnabled) {
    return { ...base, reason: "Đề cử bằng điểm thưởng chưa được bật." };
  }

  if (!originPolicy.canJoinBoostCampaign) {
    return { ...base, reason: "Story không đủ điều kiện tham gia boost campaign." };
  }

  if (settings.coinBoostEnabled && settings.currency === "coin") {
    return { ...base, reason: "Đề cử bằng xu chưa khả dụng trong phiên bản này." };
  }

  if (!input.userId) {
    return { ...base, reason: "Đăng nhập để đề cử truyện." };
  }

  const minSpend = Math.max(settings.minBoostPoints, settings.pointsPerUnit);

  try {
    const storyResult = await db.execute(sql`
      select
        s.id,
        s.status,
        s.visibility,
        s.published_at,
        s.creator_id,
        cp.user_id as creator_user_id
      from public.stories s
      left join public.creator_profiles cp on cp.id = s.creator_id
      where s.id = ${input.storyId}::uuid
      limit 1
    `);

    const story = storyResult.rows[0] as
      | {
          id: string;
          status: string;
          visibility: string;
          published_at: string | null;
          creator_id: string | null;
          creator_user_id: string | null;
        }
      | undefined;

    if (!story || !canViewPublicStory(story.status, story.visibility)) {
      return { ...base, reason: "Truyện không khả dụng." };
    }

    if (
      !settings.allowCreatorSelfBoost &&
      story.creator_user_id &&
      story.creator_user_id === input.userId
    ) {
      return { ...base, reason: "Tác giả không thể tự đề cử truyện của mình." };
    }

    if (story.published_at) {
      const ageHours =
        (Date.now() - new Date(story.published_at).getTime()) / (1000 * 60 * 60);
      if (ageHours < settings.minStoryAgeHours) {
        return { ...base, reason: "Truyện quá mới — thử lại sau." };
      }
    }

    const [userUsed, storyUsed] = await Promise.all([
      getDailyBoostPoints({ userId: input.userId }),
      getDailyBoostPoints({ storyId: input.storyId })
    ]);

    const userDailyRemaining = Math.max(0, settings.userDailyCap - userUsed);
    const storyDailyRemaining = Math.max(0, settings.storyDailyCap - storyUsed);

    if (balance < minSpend) {
      return {
        ...base,
        userDailyRemaining,
        storyDailyRemaining,
        reason: "Không đủ điểm thưởng."
      };
    }

    if (userDailyRemaining < settings.boostPointsPerUnit) {
      return {
        ...base,
        userDailyRemaining,
        storyDailyRemaining,
        reason: "Bạn đã đạt giới hạn đề cử hôm nay."
      };
    }

    if (storyDailyRemaining < settings.boostPointsPerUnit) {
      return {
        ...base,
        userDailyRemaining,
        storyDailyRemaining,
        reason: "Truyện này đã đạt giới hạn đề cử hôm nay."
      };
    }

    return {
      ...base,
      canBoost: true,
      userDailyRemaining,
      storyDailyRemaining
    };
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return { ...base, reason: "Tính năng chưa sẵn sàng." };
    }
    throw error;
  }
}

export async function countUserBoostsForStoryToday(userId: string, storyId: string) {
  try {
    const result = await db.execute(sql`
      select count(*)::int as total
      from public.story_boosts
      where user_id = ${userId}::uuid
        and story_id = ${storyId}::uuid
        and decay_group = current_date
        and engagement_source = 'user'
        and status = 'completed'
    `);
    return Number((result.rows[0] as { total?: number })?.total ?? 0);
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return 0;
    }
    throw error;
  }
}
