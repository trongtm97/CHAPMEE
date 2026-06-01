export type StudioCommentFilter =
  | "all"
  | "unreplied"
  | "replied"
  | "pinned"
  | "reported"
  | "hidden";

export type StudioCommentTimeFilter = "today" | "7d" | "30d" | "all";

export type StudioCommentSort =
  | "newest"
  | "oldest"
  | "unreplied_first"
  | "reported_first";

export const COMMENT_LIST_PAGE_SIZES = [20, 30] as const;
export type CommentListPageSize = (typeof COMMENT_LIST_PAGE_SIZES)[number];
export const COMMENT_LIST_PAGE_SIZE_DEFAULT: CommentListPageSize = 20;

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
  hasAuthorReply: boolean;
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
  likeCount: number;
  replyCount: number;
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

export type StudioCommentStats = {
  newRecent: number;
  unreplied: number;
  reported: number;
  pinned: number;
};

export type StudioCommentsPageData = {
  comments: StudioCommentInboxItem[];
  stories: StudioCommentStoryOption[];
  storyGroups: StudioStoryGroupShortcut[];
  stats: StudioCommentStats;
  tabCounts: Record<StudioCommentFilter, number>;
  filteredIds: string[];
  total: number;
  page: number;
  pageSize: CommentListPageSize;
  totalPages: number;
  hasActiveFilters: boolean;
  error: string | null;
};
