import type { CollectionSummary } from "@/types/collection";
import type { ProfileBadge, ProfileStat } from "@/types/profile";
import type { BadgeViewItem } from "@/types/badge";
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

export type PublicProfileTab =
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

export type PublicProfileViewer = {
  userId: string | null;
  isOwner: boolean;
  isFollowing: boolean;
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
  likeCount: number;
  replyCount: number;
  createdAt: string;
};

export type PublicWorkItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  chapterCount: number;
  readCount: number | null;
  statusLabel: string;
  authorName: string | null;
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
};

export const DEFAULT_PROFILE_PRIVACY: Omit<ProfilePrivacySettings, "userId" | "updatedAt"> = {
  showPublicCollections: true,
  showPublicActivities: true,
  showPublicComments: true,
  showBadges: true,
  showCreatorWorks: true,
  showReadingHistory: false,
  showSavedStories: false,
  showFollowedAuthors: false,
  showFollowedGroups: false,
  allowFollow: true,
  allowDm: false
};
