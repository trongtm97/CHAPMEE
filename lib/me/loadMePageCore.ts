import { getCurrentAuthContext } from "@/lib/auth/permissions";
import type { CurrentUserProfile, CurrentUserState } from "@/lib/auth/getCurrentUser";
import { getContinueReading } from "@/lib/reading/getContinueReading";
import { getReaderProfile } from "@/lib/profile/getReaderProfile";
import { buildReaderStats } from "@/lib/profile/profileIdentity";
import { getCreatorProfileByUserId } from "@/lib/creator/getCreatorProfile";
import { getCreatorDashboard } from "@/lib/creator/getCreatorDashboard";
import { getMyCollections } from "@/lib/supabase/collections";
import { getMyThankYous } from "@/lib/supabase/thank-yous";
import { getUnreadNotificationCount } from "@/lib/supabase/notifications";
import { getLifecycleNudgeForUser } from "@/lib/supabase/lifecycle";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { buildAchievementPreview } from "@/lib/me/buildAchievementPreview";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { getMyCommunityGroups } from "@/lib/community/get-community-groups";
import { getContactSettings } from "@/lib/settings/get-contact-settings";
import { loadMeMonetizationFlags } from "@/lib/me/loadMeMonetization";
import type { MePageData } from "@/types/me-page";

type LoadMePageCoreParams = {
  user: NonNullable<CurrentUserState["user"]>;
  profile: CurrentUserProfile | null;
  refreshError: string | null;
};

export async function loadMePageCore({
  profile,
  refreshError,
  user
}: LoadMePageCoreParams): Promise<MePageData> {
  const profileFallback = profile ?? {
    id: user.id,
    username: null,
    display_name: null,
    avatar_url: null,
    bio: null,
    role: "user" as const,
    created_at: new Date().toISOString()
  };

  const [
    { items: currentlyReading },
    readerProfile,
    { creatorProfile },
    collections,
    authContext,
    lifecycleNudge,
    unreadNotificationCount,
    communityGroups,
    contactSettingsResult,
    monetization
  ] = await Promise.all([
    getContinueReading(user.id, 5),
    getReaderProfile(profileFallback),
    getCreatorProfileByUserId(user.id),
    getMyCollections(6),
    getCurrentAuthContext(),
    getLifecycleNudgeForUser(user.id, "me"),
    getUnreadNotificationCount(user.id),
    getMyCommunityGroups(user.id),
    getContactSettings(),
    loadMeMonetizationFlags({ userId: user.id, role: profile?.role })
  ]);

  const [thankYous, achievementPreview, creatorDashboard] = await Promise.all([
    getMyThankYous(user.id, {
      earlyFanStories: readerProfile.earlyFanStories,
      topFanHighlights: readerProfile.topFanHighlights
    }),
    Promise.resolve(buildAchievementPreview(readerProfile)),
    creatorProfile ? getCreatorDashboard(creatorProfile) : Promise.resolve(null)
  ]);

  const accountNotice = authContext?.flags.isBanned
    ? "Tài khoản của bạn đang bị hạn chế. Một số thao tác ghi (bình luận, đăng bài, nạp coin...) tạm khóa."
    : null;
  const permissionFlags = {
    canCreateStory: authContext?.flags.canCreateStory ?? Boolean(creatorProfile),
    canOpenStudio: authContext?.flags.canOpenStudio ?? Boolean(creatorProfile),
    canViewAdmin: authContext?.flags.canViewAdmin ?? false,
    canManageFinance: authContext?.flags.canManageFinance ?? false
  };

  const displayName =
    profile?.display_name ?? profile?.username ?? user.email ?? "Độc giả ChapMee";
  const handle = buildProfileHandle({
    username: profile?.username,
    displayName: profile?.display_name,
    userId: user.id
  });
  const currentReadingCount = currentlyReading.length;
  const stats = buildReaderStats({
    commentCount: readerProfile.metrics.commentCount,
    currentReadingCount,
    followingAuthorsCount: readerProfile.metrics.followingAuthorsCount,
    savedStoriesCount: readerProfile.metrics.savedStoriesCount
  });
  const profileBadges = monetization.vipActive
    ? [{ label: "VIP", tone: "success" as const }, ...readerProfile.badges]
    : readerProfile.badges;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName,
      handle,
      bio: profile?.bio ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      role: profile?.role ?? "user"
    },
    stats,
    profileBadges,
    currentlyReading,
    readerProfile,
    creatorProfile,
    creatorStats: creatorDashboard
      ? {
          stories: creatorDashboard.stats.totalStories,
          reads: creatorDashboard.stats.reads,
          comments: creatorDashboard.stats.comments,
          revenue: null
        }
      : null,
    collections,
    thankYous,
    communityGroupsCount: communityGroups.groups.length,
    activities: [],
    achievementPreview,
    unreadNotificationCount,
    lifecycleNudge,
    accountNotice,
    permissionFlags,
    refreshError: refreshError ?? readerProfile.error,
    shareUrl: profile?.username
      ? getShareUrl(`/profile/${profile.username}`)
      : getShareUrl(`/me/${user.id}`),
    contactSettings: contactSettingsResult.settings,
    monetization
  };
}
