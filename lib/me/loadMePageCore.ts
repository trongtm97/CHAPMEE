import { getCurrentAuthContext } from "@/lib/auth/permissions";
import type { CurrentUserProfile, CurrentUserState } from "@/lib/auth/getCurrentUser";
import { getContinueReading } from "@/lib/reading/getContinueReading";
import { getReaderProfile } from "@/lib/profile/getReaderProfile";
import { buildReaderStats } from "@/lib/profile/profileIdentity";
import { getCreatorProfileByUserId } from "@/lib/creator/getCreatorProfile";
import { getCreatorDashboard } from "@/lib/creator/getCreatorDashboard";
import { getMyCollections } from "@/lib/data/collections";
import { getMyThankYous } from "@/lib/data/thank-yous";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { getUnreadMessageCount } from "@/lib/messages/get-unread-count";
import { getPublicVerificationBadge } from "@/lib/verification/get-user-verification";
import { getLifecycleNudgeForUser } from "@/lib/data/lifecycle";
import { ensureProfileUsername } from "@/lib/profile/ensure-profile-username";
import { profileAvatarUrlFromRow } from "@/lib/profile/map-profile-row";
import { getPublicProfileSharePath } from "@/lib/profile/profile-url";
import { getShareUrl } from "@/lib/share/getShareUrl";
import { buildAchievementPreview } from "@/lib/me/buildAchievementPreview";
import { buildProfileHandle } from "@/lib/profile/buildProfileHandle";
import { getMyCommunityGroups } from "@/lib/community/get-community-groups";
import { getContactSettings } from "@/lib/settings/get-contact-settings";
import { humanizeMeError } from "@/lib/me/humanize-me-error";
import { getContinueListeningAudioForUser } from "@/src/lib/audio/continue-listening";
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
  const ensuredUsername = await ensureProfileUsername(
    user.id,
    profile?.display_name
  );
  const profileWithUsername =
    profile && ensuredUsername
      ? { ...profile, username: ensuredUsername }
      : profile;

  const profileFallback = profileWithUsername ?? {
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
    unreadMessagesCount,
    verificationBadge,
    communityGroups,
    contactSettingsResult,
    monetization,
    continueListeningAudio
  ] = await Promise.all([
    getContinueReading(user.id, 5),
    getReaderProfile(profileFallback),
    getCreatorProfileByUserId(user.id),
    getMyCollections(6),
    getCurrentAuthContext(),
    getLifecycleNudgeForUser(user.id, "me").catch(() => null),
    getUnreadNotificationCount(user.id),
    getUnreadMessageCount(user.id).catch(() => 0),
    getPublicVerificationBadge(user.id).catch(() => null),
    getMyCommunityGroups(user.id),
    getContactSettings(),
    loadMeMonetizationFlags({ userId: user.id, role: profile?.role }),
    getContinueListeningAudioForUser(user.id, 5)
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
    profileWithUsername?.display_name ??
    profileWithUsername?.username ??
    user.email ??
    "Độc giả ChapMee";
  const handle = buildProfileHandle({
    username: profileWithUsername?.username,
    displayName: profileWithUsername?.display_name,
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

  const username = ensuredUsername ?? profileWithUsername?.username ?? null;
  const publicSharePath = getPublicProfileSharePath(username);
  const isVerified = verificationBadge != null;

  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      displayName,
      handle,
      username,
      bio: profileWithUsername?.bio ?? null,
      avatarUrl: profileAvatarUrlFromRow(profileWithUsername),
      role: profileWithUsername?.role ?? "user",
      isVerified
    },
    publicProfilePath: publicSharePath,
    stats,
    profileBadges,
    currentlyReading,
    continueListeningAudio,
    readerProfile,
    creatorProfile,
    creatorStats: creatorDashboard
      ? {
          stories: creatorDashboard.stats.totalStories,
          reads: creatorDashboard.stats.reads,
          comments: creatorDashboard.stats.comments,
          drafts: creatorDashboard.stories.filter((s) => s.status === "draft").length,
          revenue: null
        }
      : null,
    recentCreatorStories: creatorDashboard?.stories.slice(0, 3) ?? [],
    unreadMessagesCount,
    collections,
    thankYous,
    communityGroupsCount: communityGroups.groups.length,
    activities: [],
    achievementPreview,
    unreadNotificationCount,
    lifecycleNudge,
    accountNotice,
    permissionFlags,
    refreshError: humanizeMeError(refreshError ?? readerProfile.error),
    shareUrl: publicSharePath ? getShareUrl(publicSharePath) : "",
    contactSettings: contactSettingsResult.settings,
    monetization
  };
}
