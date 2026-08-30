export type InlineCommentAnchorStatus = "active" | "orphaned" | "suppressed";

export type InlineCommentStatus = "visible" | "hidden" | "deleted";

export type InlineCommentEngagementSource =
  | "user"
  | "system"
  | "admin_seed"
  | "import"
  | "test";

export type InlineThreadSummary = {
  threadId: string;
  anchorId: string;
  blockId: string;
  startOffset: number;
  endOffset: number;
  quoteText: string;
  anchorStatus: InlineCommentAnchorStatus;
  commentCount: number;
  replyCount: number;
  lastActivityAt: string;
};

export type InlineCommentView = {
  id: string;
  userId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  displayName: string | null;
  username: string | null;
  canDelete: boolean;
};

export type InlineThreadDetail = InlineThreadSummary & {
  chapterId: string;
  storyId: string;
  comments: InlineCommentView[];
};

export type InlineThreadsPageResult = {
  threads: InlineThreadSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
};

export type InlineBlockCommentCounts = {
  blockId: string;
  threadCount: number;
  commentCount: number;
};

export type InlineCommentsPageResult = {
  comments: InlineCommentView[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
};

export type CreateInlineCommentInput = {
  chapterId: string;
  storyId: string;
  blockId: string;
  blockIndex?: number | null;
  startOffset: number;
  endOffset: number;
  quoteText: string;
  body: string;
  contentHashAtAnchor?: string | null;
  prefixText?: string | null;
  suffixText?: string | null;
};

export type CreateInlineCommentResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  threadId: string | null;
  commentId: string | null;
};

export type ReplyInlineCommentResult = {
  ok: boolean;
  error: string | null;
  loginRequired: boolean;
  commentId: string | null;
};

export type AdminInlineCommentRow = {
  id: string;
  body: string;
  status: string;
  reportCount: number;
  createdAt: string;
  userId: string;
  displayName: string | null;
  username: string | null;
  quoteText: string;
  blockId: string;
  anchorStatus: string;
  chapterId: string;
  chapterTitle: string | null;
  episodeNumber: number | null;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  threadId: string;
};

/** Admin moderation queue — one row per thread. */
export type AdminInlineThreadRow = {
  threadId: string;
  storyId: string;
  storyTitle: string;
  storySlug: string;
  chapterId: string;
  chapterTitle: string | null;
  episodeNumber: number | null;
  blockId: string;
  quoteText: string;
  anchorStatus: string;
  threadStatus: string;
  commentCount: number;
  reportCount: number;
  authorDisplayName: string | null;
  authorUsername: string | null;
  createdAt: string;
};
