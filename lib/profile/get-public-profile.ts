import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { getProfilePrivacySettings } from "@/lib/profile/get-profile-privacy";
import { getPublicCollectionsForUser } from "@/lib/profile/get-public-collections";
import { getPublicActivitiesForUser } from "@/lib/profile/get-public-activities";
import { getPublicCommentsForUser } from "@/lib/profile/get-public-comments";
import { getPublicWorksForUser } from "@/lib/profile/get-public-works";
import {
  getUserBadges,
  toBadgeViewItems,
  toProfileBadgeChips
} from "@/lib/supabase/badges";
import { buildReaderBadges } from "@/lib/profile/profileIdentity";
import { formatCompactCount } from "@/lib/profile/profileIdentity";
import { getMessagingCapability } from "@/lib/messages/message-permissions";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import type {
  PublicProfilePageData,
  PublicProfileTab
} from "@/types/public-profile";
import type { ProfileStat } from "@/types/profile";

export async function getPublicProfileByUsername(
  username: string,
  options?: { page?: number; tab?: PublicProfileTab }
): Promise<PublicProfilePageData | null> {
  const normalized = username.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at, role, status")
    .eq("username", normalized)
    .maybeSingle();

  if (error || !profile?.username) {
    return null;
  }

  if (profile.status && profile.status !== "active") {
    return null;
  }

  const page = Math.max(1, options?.page ?? 1);
  const tab = options?.tab ?? "collections";

  const { profile: viewerProfile } = await getCurrentUser();
  const viewerId = viewerProfile?.id ?? null;
  const isOwner = viewerId === profile.id;

  const privacy = await getProfilePrivacySettings(profile.id);

  const [
    { data: creatorRow },
    { data: followStats },
    { data: readerMetrics },
    isFollowingResult,
    badgesRaw
  ] = await Promise.all([
    supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase.rpc("get_public_user_follow_stats", { input_user_id: profile.id }),
    supabase.rpc("get_reader_profile_metrics", { input_user_id: profile.id }),
    viewerId && !isOwner
      ? supabase
          .from("user_follows")
          .select("id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    privacy.showBadges ? getUserBadges({ userId: profile.id }) : Promise.resolve([])
  ]);

  const creatorId = creatorRow?.id ? String(creatorRow.id) : null;
  const isCreator = Boolean(creatorId);
  const followRow = Array.isArray(followStats) ? followStats[0] : followStats;
  const metricsRow = Array.isArray(readerMetrics) ? readerMetrics[0] : readerMetrics;

  const followingCount = Number(followRow?.following_count ?? 0);
  const followerCount = Number(followRow?.follower_count ?? 0);
  const commentLikeCount = Number(metricsRow?.comment_like_count ?? 0);

  const badgeRecords = badgesRaw;
  const badgeItems = toBadgeViewItems(badgeRecords);
  let badgeChips = privacy.showBadges
    ? toProfileBadgeChips(badgeRecords)
    : buildReaderBadges({
        profileRole: isCreator ? "creator" : "user",
        createdAt: profile.created_at,
        savedStoriesCount: 0,
        followingAuthorsCount: 0
      }).slice(0, 3);

  if (isCreator && !badgeChips.some((badge) => badge.label === "Tác giả")) {
    badgeChips = [{ label: "Tác giả", tone: "default" as const }, ...badgeChips].slice(
      0,
      6
    );
  }

  const stats: ProfileStat[] = [
    { label: "Đang theo dõi", value: formatCompactCount(followingCount) },
    { label: "Người theo dõi", value: formatCompactCount(followerCount) },
    {
      label: "Uy tín",
      value: formatCompactCount(commentLikeCount),
      hint: "Lượt thích bình luận"
    }
  ];

  if (isCreator && privacy.showCreatorWorks && creatorId) {
    const { data: creatorMetrics } = await supabase.rpc(
      "get_public_creator_profile_metrics",
      { input_creator_id: creatorId }
    );
    const cm = Array.isArray(creatorMetrics) ? creatorMetrics[0] : creatorMetrics;
    stats.push(
      { label: "Truyện", value: formatCompactCount(Number(cm?.story_count ?? 0)) },
      {
        label: "Lượt đọc",
        value: formatCompactCount(Number(cm?.total_read_count ?? 0))
      }
    );
  }

  const visibleTabs: PublicProfileTab[] = [];
  if (privacy.showPublicCollections) {
    visibleTabs.push("collections");
  }
  if (privacy.showPublicActivities) {
    visibleTabs.push("activity");
  }
  if (privacy.showPublicComments) {
    visibleTabs.push("comments");
  }
  if (privacy.showBadges) {
    visibleTabs.push("badges");
  }
  if (isCreator && privacy.showCreatorWorks) {
    visibleTabs.push("works");
  }

  const activeTab = visibleTabs.includes(tab)
    ? tab
    : (visibleTabs[0] ?? "collections");

  const [collections, activities, comments, works] = await Promise.all([
    privacy.showPublicCollections && activeTab === "collections"
      ? getPublicCollectionsForUser(profile.id, page)
      : Promise.resolve({ items: [], total: 0 }),
    privacy.showPublicActivities && activeTab === "activity"
      ? getPublicActivitiesForUser(profile.id, privacy, page)
      : Promise.resolve({ items: [], total: 0 }),
    privacy.showPublicComments && activeTab === "comments"
      ? getPublicCommentsForUser(profile.id, privacy, page)
      : Promise.resolve({ items: [], total: 0 }),
    isCreator && privacy.showCreatorWorks && activeTab === "works"
      ? getPublicWorksForUser(profile.id, creatorId, privacy, page)
      : Promise.resolve({ items: [], total: 0 })
  ]);

  const displayName =
    profile.display_name ?? profile.username ?? "Thành viên ChapMee";

  const [messaging, verification] = await Promise.all([
    getMessagingCapability(viewerId, profile.id),
    getPublicVerificationBadge(profile.id)
  ]);

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
      avatarUrl: profile.avatar_url,
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
      isFollowing: Boolean(isFollowingResult.data)
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
    worksTotal: works.total
  };
}
