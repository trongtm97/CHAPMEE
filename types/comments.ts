export type StudioCommentFilter =
  | "all"
  | "unreplied"
  | "replied"
  | "pinned"
  | "reported"
  | "hidden";

export type StudioCommentInboxStatus =
  | "new"
  | "replied"
  | "hidden"
  | "reported";

export type StudioCommentSource = "story" | "community_post";

export type StudioCommentInboxItem = {
  id: string;
  content: string;
  createdAt: string;
  status: StudioCommentInboxStatus;
  source: StudioCommentSource;
  isPinned: boolean;
  isHidden: boolean;
  hasOpenReport: boolean;
  authorUserId: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  storyId: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  episodeId: string | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  communityPostId: string | null;
  communityPostTitle: string | null;
  contextLabel: string;
  contextHref: string;
};

export type StudioCommentStoryOption = {
  id: string;
  title: string;
};

export type StudioStoryGroupShortcut = {
  id: string;
  storyId: string;
  name: string;
  slug: string;
  postCount: number;
  groupHref: string;
};

export type StudioCommentsPageData = {
  comments: StudioCommentInboxItem[];
  stories: StudioCommentStoryOption[];
  storyGroups: StudioStoryGroupShortcut[];
  error: string | null;
};
