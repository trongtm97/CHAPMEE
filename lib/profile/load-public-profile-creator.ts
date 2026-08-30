import { getMonetizationConfig } from "@/lib/monetization/config";
import { getSupporterRankingForAuthor } from "@/lib/monetization/supporter-ranking";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import {
  buildAuthorAchievements,
  formatCompactCount
} from "@/lib/profile/profileIdentity";
import { getAuthorTopFans } from "@/lib/data/fan-scores";
import {
  getUserBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/data/badges";
import { getUserMilestones, toMilestoneViewItems } from "@/lib/data/milestones";
import { createClient } from "@/lib/data/server";
import type { PublicProfileCreatorExtras, PublicWorkItem } from "@/types/public-profile";
import type { ProfileStat } from "@/types/profile";

type LoadCreatorExtrasInput = {
  creatorId: string;
  userId: string;
  creatorCreatedAt: string;
  viewerId: string | null;
  showBadges: boolean;
  featuredWork: PublicWorkItem | null;
  followingCount: number;
};

export async function loadPublicProfileCreatorExtras(
  input: LoadCreatorExtrasInput
): Promise<{
  creator: PublicProfileCreatorExtras;
  stats: ProfileStat[];
  badgeChips: ReturnType<typeof toProfileBadgeChips>;
  badgeItems: ReturnType<typeof toBadgeViewItems>;
  isFollowingCreator: boolean;
}> {
  const db = await createClient();

  const [metricsResult, followingResult, badgeRecords, milestoneRecords, topFans, monetizationConfig] =
    await Promise.all([
      db.rpc("get_public_creator_profile_metrics", {
        input_creator_id: input.creatorId
      }),
      input.viewerId
        ? db
            .from("follows")
            .select("id")
            .eq("creator_id", input.creatorId)
            .eq("follower_id", input.viewerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      input.showBadges
        ? getUserBadges({ userId: input.userId, type: ["author", "general"] })
        : Promise.resolve([]),
      input.showBadges
        ? getUserMilestones({
            limit: 12,
            type: ["author", "story", "general"],
            userId: input.userId
          })
        : Promise.resolve([]),
      getAuthorTopFans(input.creatorId, input.viewerId, 5),
      getMonetizationConfig()
    ]);

  const metrics = Array.isArray(metricsResult.data)
    ? metricsResult.data[0]
    : metricsResult.data;

  let followerCount = Number(metrics?.follower_count ?? 0);
  let totalLikes = Number(metrics?.total_like_count ?? 0);
  let totalReads = Number(metrics?.total_read_count ?? 0);
  let storiesCount = Number(metrics?.story_count ?? 0);

  if (metricsResult.error && isMissingSchemaError(metricsResult.error)) {
    const [storiesResult, followersResult] = await Promise.all([
      db
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", input.creatorId)
        .eq("visibility", "public")
        .in("status", ["approved", "published"]),
      db
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", input.creatorId)
        .eq("following_type", "creator")
    ]);

    const storyIds = (
      (
        await db
          .from("stories")
          .select("id")
          .eq("creator_id", input.creatorId)
          .eq("visibility", "public")
          .in("status", ["approved", "published"])
      ).data ?? []
    ).map((row) => row.id as string);

    const [likesResult, readsResult] = storyIds.length
      ? await Promise.all([
          db
            .from("reactions")
            .select("id", { count: "exact", head: true })
            .eq("target_type", "story")
            .in("target_id", storyIds),
          db
            .from("analytics_events")
            .select("id", { count: "exact", head: true })
            .eq("event_name", "open_story")
            .in("target_id", storyIds)
        ])
      : [{ count: 0 }, { count: 0 }];

    followerCount = Number(followersResult.count ?? 0);
    storiesCount = Number(storiesResult.count ?? 0);
    totalLikes = Number(likesResult.count ?? 0);
    totalReads = Number(readsResult.count ?? 0);
  }

  const monetizationEnabled = Boolean(
    monetizationConfig.settings["monetization.enabled"]
  );

  let supporters: Awaited<ReturnType<typeof getSupporterRankingForAuthor>>["data"] = [];
  if (monetizationEnabled) {
    const ranking = await getSupporterRankingForAuthor(input.userId, 5);
    supporters = ranking.data;
  }

  const badgeItems = input.showBadges ? toBadgeViewItems(badgeRecords) : [];
  const badgeChips = input.showBadges ? toProfileBadgeChips(badgeRecords) : [];
  const milestones = input.showBadges ? toMilestoneViewItems(milestoneRecords) : [];
  const achievements = input.showBadges
    ? buildAuthorAchievements({
        createdAt: input.creatorCreatedAt,
        followerCount,
        storiesCount,
        totalReads
      })
    : [];

  return {
    stats: [
      { label: "Đang theo dõi", value: formatCompactCount(input.followingCount) },
      { label: "Người theo dõi", value: formatCompactCount(followerCount) },
      { label: "Truyện", value: formatCompactCount(storiesCount) },
      { label: "Lượt đọc", value: formatCompactCount(totalReads) }
    ],
    badgeChips,
    badgeItems,
    isFollowingCreator: Boolean(followingResult.data),
    creator: {
      achievements,
      milestones,
      topFans,
      supporters,
      showSupportersSection: monetizationEnabled && supporters.length > 0,
      showTopFansSection: topFans.length > 0,
      featuredWork: input.featuredWork,
      totalReads,
      totalLikes,
      storiesCount
    }
  };
}
