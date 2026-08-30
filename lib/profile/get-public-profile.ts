import { createClient } from "@/lib/data/server";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import { resolveProfileAvatarUrl } from "@/lib/profile/resolve-profile-avatar";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { getProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { getPublicCollectionsForUser } from "@/lib/profile/get-public-collections";
import { getPublicActivitiesForUser } from "@/lib/profile/get-public-activities";
import { getPublicCommentsForUser } from "@/lib/profile/get-public-comments";
import { getPublicCommunityPostsForUser } from "@/lib/profile/get-public-profile-posts";
import { getPublicReelsForUser } from "@/lib/profile/get-public-profile-reels";
import { getPublicWorksForUser } from "@/lib/profile/get-public-works";
import {
  filterAchievementsForProfileViewer,
  hasPublicAchievementContent
} from "@/lib/profile/filter-public-profile-display";
import { loadPublicProfileCreatorExtras } from "@/lib/profile/load-public-profile-creator";
import { resolvePublicProfileTab } from "@/lib/profile/map-public-profile-tab";
import {
  getUserBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/data/badges";
import {
  buildReaderAchievements,
  buildReaderBadges,
  formatCompactCount
} from "@/lib/profile/profileIdentity";
import { getMessagingCapability } from "@/lib/messages/message-permissions";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type {
  PublicProfilePageData,
  PublicProfileTab,
  PublicWorksSort
} from "@/types/public-profile";
import type { ProfileStat } from "@/types/profile";

function normalizeWorksSort(raw: string | undefined): PublicWorksSort {
  if (raw === "published" || raw === "popular") {
    return raw;
  }
  return "updated";
}

export async function getPublicProfileByUsername(
  username: string,
  options?: { page?: number; tab?: string; sort?: string }
): Promise<PublicProfilePageData | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const db = await createClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, default_avatar_id, created_at, role, status")
    .eq("username", normalized)
    .maybeSingle();

  if (error || !profile?.username) {
    return null;
  }

  if (profile.status && profile.status !== "active") {
    return null;
  }

  const page = Math.max(1, options?.page ?? 1);
  const worksSort = normalizeWorksSort(options?.sort);

  const { profile: viewerProfile } = await getCurrentUser();
  const viewerId = viewerProfile?.id ?? null;
  const isOwner = viewerId === profile.id;

  const privacy = await getProfilePrivacySettings(profile.id);

  const [
    { data: creatorRow },
    { data: followStats },
    readerMetricsResult,
    isFollowingResult
  ] = await Promise.all([
      db
        .from("creator_profiles")
        .select("id, created_at")
        .eq("user_id", profile.id)
        .eq("status", "active")
        .maybeSingle(),
    db.rpc("get_public_user_follow_stats", { input_user_id: profile.id }),
    db.rpc("get_reader_profile_metrics", { input_user_id: profile.id }),
    viewerId && !isOwner
      ? db
          .from("user_follows")
          .select("id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const creatorId = creatorRow?.id ? String(creatorRow.id) : null;
  const isCreator = Boolean(creatorId);
  const followRow = Array.isArray(followStats) ? followStats[0] : followStats;
  const metricsError = readerMetricsResult.error;
  let metricsRow = Array.isArray(readerMetricsResult.data)
    ? readerMetricsResult.data[0]
    : readerMetricsResult.data;

  if (metricsError && isMissingSchemaError(metricsError)) {
    const [commentsResult, commentRowsResult] = await Promise.all([
      db
        .from("comments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.id),
      db.from("comments").select("id").eq("user_id", profile.id)
    ]);

    const commentIds = ((commentRowsResult.data ?? []) as Array<{ id: string }>).map(
      (row) => row.id
    );
    let commentLikeCount = 0;

    if (commentIds.length > 0) {
      const likesResult = await db
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .eq("target_type", "comment")
        .eq("reaction_type", "like")
        .in("target_id", commentIds);

      commentLikeCount = Number(likesResult.count ?? 0);
    }

    metricsRow = {
      comment_count: Number(commentsResult.count ?? 0),
      comment_like_count: commentLikeCount,
      following_creator_count: null,
      saved_story_count: null
    };
  }

  const followerCount = Number(followRow?.follower_count ?? 0);
  const followingCount = Number(followRow?.following_count ?? 0);
  const commentLikeCount = Number(metricsRow?.comment_like_count ?? 0);

  const readerBadgeRecords = privacy.showBadges
    ? await getUserBadges({ userId: profile.id })
    : [];

  let badgeChips = privacy.showBadges
    ? toProfileBadgeChips(readerBadgeRecords)
    : buildReaderBadges({
        profileRole: isCreator ? "creator" : "user",
        createdAt: profile.created_at,
        savedStoriesCount: 0,
        followingAuthorsCount: 0
      }).slice(0, 3);

  let badgeItems = privacy.showBadges ? toBadgeViewItems(readerBadgeRecords) : [];

  let stats: ProfileStat[] = isCreator
    ? []
    : [
        { label: "Đang theo dõi", value: formatCompactCount(followingCount) },
        { label: "Người theo dõi", value: formatCompactCount(followerCount) },
        {
          label: "Uy tín",
          value: formatCompactCount(commentLikeCount),
          hint: "Lượt thích bình luận"
        }
      ];

  let creatorExtras: PublicProfilePageData["creator"] = null;
  let isFollowingCreator = Boolean(isFollowingResult.data);

  if (isCreator && creatorId) {
    const worksPreview = await getPublicWorksForUser(
      profile.id,
      creatorId,
      privacy,
      1,
      "updated"
    );
    const featuredWork = worksPreview.items[0] ?? null;

    const loaded = await loadPublicProfileCreatorExtras({
      creatorId,
      userId: profile.id,
      creatorCreatedAt: creatorRow?.created_at ?? profile.created_at,
      viewerId,
      showBadges: privacy.showBadges,
      featuredWork,
      followingCount
    });

    creatorExtras = loaded.creator;
    stats = loaded.stats;
    badgeChips = loaded.badgeChips;
    badgeItems = loaded.badgeItems;
    isFollowingCreator = loaded.isFollowingCreator;

  }

  const [{ count: reelsCount }, { count: communityCount }] = await Promise.all([
    db
      .from("reels_items")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", profile.id)
      .eq("status", "published"),
    db
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .eq("status", "approved")
  ]);

  let readerAchievements = privacy.showBadges
    ? buildReaderAchievements({
        createdAt: profile.created_at,
        savedStoriesCount: Number(metricsRow?.saved_story_count ?? 0),
        followingAuthorsCount: Number(metricsRow?.following_creator_count ?? 0),
        commentCount: Number(metricsRow?.comment_count ?? 0),
        commentLikeCount
      })
    : [];

  if (!privacy.showBadges) {
    badgeItems = [];
    badgeChips = isCreator
      ? []
      : buildReaderBadges({
          profileRole: "user",
          createdAt: profile.created_at,
          savedStoriesCount: 0,
          followingAuthorsCount: 0
        }).slice(0, 3);
    readerAchievements = [];
    if (creatorExtras) {
      creatorExtras = {
        ...creatorExtras,
        achievements: [],
        milestones: []
      };
    }
  }

  readerAchievements = filterAchievementsForProfileViewer(
    readerAchievements,
    isOwner
  );

  if (creatorExtras) {
    creatorExtras = {
      ...creatorExtras,
      achievements: filterAchievementsForProfileViewer(
        creatorExtras.achievements,
        isOwner
      )
    };
  }

  const achievementSource = creatorExtras?.achievements ?? readerAchievements;
  const showAchievementsTab =
    privacy.showBadges &&
    hasPublicAchievementContent({
      achievements: achievementSource,
      badgeItems,
      milestones: creatorExtras?.milestones ?? [],
      isOwner
    });

  const visibleTabs: PublicProfileTab[] = [];
  if (isCreator && privacy.showCreatorWorks) {
    visibleTabs.push("stories");
  }
  if (privacy.showCreatorWorks && (reelsCount ?? 0) > 0) {
    visibleTabs.push("reels");
  }
  if (privacy.showPublicActivities && (communityCount ?? 0) > 0) {
    visibleTabs.push("community");
  }
  if (showAchievementsTab) {
    visibleTabs.push("achievements");
  }
  visibleTabs.push("about");

  const activeTab = resolvePublicProfileTab(options?.tab, visibleTabs);

  const [collections, activities, comments, works, communityPosts, reels] =
    await Promise.all([
    privacy.showPublicCollections && activeTab === "about"
      ? getPublicCollectionsForUser(profile.id, page)
      : Promise.resolve({ items: [], total: 0 }),
    privacy.showPublicActivities && activeTab === "about"
      ? getPublicActivitiesForUser(profile.id, privacy, page)
      : Promise.resolve({ items: [], total: 0 }),
    privacy.showPublicComments && activeTab === "about"
      ? getPublicCommentsForUser(profile.id, privacy, page)
      : Promise.resolve({ items: [], total: 0 }),
    isCreator && privacy.showCreatorWorks && activeTab === "stories"
      ? getPublicWorksForUser(
          profile.id,
          creatorId,
          privacy,
          page,
          worksSort
        )
      : Promise.resolve({ items: [], total: 0 }),
    activeTab === "community"
      ? getPublicCommunityPostsForUser(profile.id, page, {
          allowed: privacy.showPublicActivities
        })
      : Promise.resolve({ items: [], total: 0 }),
    activeTab === "reels"
      ? getPublicReelsForUser(profile.id, page, {
          allowed: privacy.showCreatorWorks
        })
      : Promise.resolve({ items: [], total: 0 })
    ]);

  const displayName =
    profile.display_name ?? profile.username ?? "Thành viên ChapMee";

  const [messaging, verification] = await Promise.all([
    getMessagingCapability(viewerId, profile.id),
    getPublicVerificationBadge(profile.id)
  ]);

  const followTarget = isOwner
    ? null
    : isCreator && creatorId
      ? { type: "creator" as const, creatorId }
      : { type: "user" as const, userId: profile.id };

  return {
    user: {
      id: profile.id,
      username: profile.username,
      displayName,
      handle: buildProfileHandle({
        username: profile.username,
        displayName: profile.display_name,
        userId: profile.id
      }),
      bio: profile.bio,
      avatarUrl: resolveProfileAvatarUrl(profile),
      createdAt: profile.created_at,
      isCreator,
      creatorId,
      verification
    },
    privacy,
    messaging,
    viewer: {
      userId: viewerId,
      isOwner,
      isFollowing: isCreator ? isFollowingCreator : Boolean(isFollowingResult.data),
      followTarget
    },
    stats,
    badges: badgeChips,
    badgeItems,
    visibleTabs,
    collections: collections.items,
    activities: activities.items,
    comments: comments.items,
    works: works.items,
    collectionsTotal: collections.total,
    activitiesTotal: activities.total,
    commentsTotal: comments.total,
    worksTotal: works.total,
    communityPosts: communityPosts.items,
    communityPostsTotal: communityPosts.total,
    reels: reels.items,
    reelsTotal: reels.total,
    readerAchievements,
    creator: creatorExtras
  };
}
