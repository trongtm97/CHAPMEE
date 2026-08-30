import type { CollectionSummary } from "@/types/collection";
import type {
  ProfileAchievement,
  ProfileBadge,
  ProfileStat
} from "@/types/profile";
import type { BadgeViewItem } from "@/types/badge";
import type { TopFanPerson } from "@/types/fan";
import type { MilestoneViewItem } from "@/types/milestone";
import type { SupporterRankingItem } from "@/types/tip";
import type { PublicVerificationBadge } from "@/types/verification";

export type ProfilePrivacySettings = {
  userId: string;
  showPublicCollections: boolean;
  showPublicActivities: boolean;
  showPublicComments: boolean;
  showBadges: boolean;
  showCreatorWorks: boolean;
  showReadingHistory: boolean;
  showSavedStories: boolean;
  showFollowedAuthors: boolean;
  showFollowedGroups: boolean;
  allowFollow: boolean;
  allowDm: boolean;
  updatedAt: string;
};

/** Canonical public profile tabs. */
export type PublicProfileTab =
  | "stories"
  | "reels"
  | "community"
  | "achievements"
  | "about";

/** Legacy query `tab` values still accepted in routes. */
export type LegacyPublicProfileTab =
  | "collections"
  | "activity"
  | "comments"
  | "badges"
  | "works";

export type PublicProfileUser = {
  id: string;
  username: string;
  displayName: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  isCreator: boolean;
  creatorId: string | null;
  verification: PublicVerificationBadge | null;
};

export type PublicProfileFollowTarget =
  | { type: "user"; userId: string }
  | { type: "creator"; creatorId: string };

export type PublicProfileViewer = {
  userId: string | null;
  isOwner: boolean;
  isFollowing: boolean;
  followTarget: PublicProfileFollowTarget | null;
};

export type PublicActivityItem = {
  id: string;
  type: "comment" | "review" | "collection" | "badge" | "story" | "discussion";
  message: string;
  href: string | null;
  createdAt: string;
};

export type PublicCommentItem = {
  id: string;
  content: string;
  storyTitle: string;
  storySlug: string;
  storyPublicCode: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
};

export type PublicWorkItem = {
  id: string;
  slug: string;
  publicCode: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  chapterCount: number;
  readCount: number | null;
  readCountLabel: string | null;
  likeCount: number | null;
  likeCountLabel: string | null;
  statusLabel: string;
  authorName: string | null;
  genreName: string | null;
  updatedAt: string | null;
  structureType: "chaptered" | "standalone";
  standaloneReadingTimeMinutes: number;
  hasPublishedAudio?: boolean;
  hasContinuousPlayback?: boolean;
};

export type PublicWorksSort = "updated" | "published" | "popular";

export type PublicCommunityPostItem = {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  storyTitle: string | null;
  storySlug: string | null;
  storyPublicCode: string | null;
  createdAt: string;
  href: string;
};

export type PublicReelItem = {
  id: string;
  title: string;
  excerpt: string;
  coverUrl: string | null;
  viewCount: number;
  publishedAt: string | null;
  href: string;
};

export type PublicProfileCreatorExtras = {
  achievements: ProfileAchievement[];
  milestones: MilestoneViewItem[];
  topFans: TopFanPerson[];
  supporters: SupporterRankingItem[];
  showSupportersSection: boolean;
  showTopFansSection: boolean;
  featuredWork: PublicWorkItem | null;
  totalReads: number;
  totalLikes: number;
  storiesCount: number;
};

export type PublicProfileMessaging = {
  canShowButton: boolean;
  canMessage: boolean;
  mode: "direct" | "request" | null;
  reason: string | null;
  loginRequired: boolean;
};

export type PublicProfilePageData = {
  user: PublicProfileUser;
  privacy: ProfilePrivacySettings;
  messaging: PublicProfileMessaging;
  viewer: PublicProfileViewer;
  stats: ProfileStat[];
  badges: ProfileBadge[];
  badgeItems: BadgeViewItem[];
  visibleTabs: PublicProfileTab[];
  collections: CollectionSummary[];
  activities: PublicActivityItem[];
  comments: PublicCommentItem[];
  works: PublicWorkItem[];
  collectionsTotal: number;
  activitiesTotal: number;
  commentsTotal: number;
  worksTotal: number;
  communityPosts: PublicCommunityPostItem[];
  communityPostsTotal: number;
  reels: PublicReelItem[];
  reelsTotal: number;
  readerAchievements: ProfileAchievement[];
  creator: PublicProfileCreatorExtras | null;
};

export const DEFAULT_PROFILE_PRIVACY: Omit<ProfilePrivacySettings, "userId" | "updatedAt"> = {
  showPublicCollections: false,
  showPublicActivities: false,
  showPublicComments: false,
  showBadges: true,
  showCreatorWorks: true,
  showReadingHistory: false,
  showSavedStories: false,
  showFollowedAuthors: false,
  showFollowedGroups: false,
  allowFollow: true,
  allowDm: false
};
