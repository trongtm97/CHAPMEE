import type { CommunityPostType } from "@/lib/community/getCommunityFeed";

export type CommunityFeedTab = "for_you" | "hot" | "new" | "following";

export type CommunityGroupType = "story" | "author";

export type CommunityGroupBadge = "hot" | "new_chapter" | "author_reply";

export type CommunityRole = "creator" | "reader" | "mod";

export type CommunityComposerMode =
  | "post"
  | "review"
  | "poll"
  | "ask_author";

export type CommunityPostTarget = "global" | "story" | "author";

export type PollOption = {
  id: string;
  label: string;
  votes: number;
};

export type StoryCommunityGroup = {
  id: string;
  storyId: string;
  name: string;
  slug: string;
  coverUrl: string | null;
  authorName: string | null;
  memberCount: number;
  todayPostCount: number;
  badge: CommunityGroupBadge | null;
  statusLine: string;
  hotScore: number;
};

export type AuthorCommunityGroup = {
  id: string;
  authorId: string;
  name: string;
  avatarUrl: string | null;
  storyCount: number;
  followerCount: number;
  statusLine: string;
  isReplying: boolean;
};

export type CommunityFeedItemKind =
  | "user_post"
  | "story_comment_highlight"
  | "author_reply"
  | "review"
  | "poll"
  | "challenge"
  | "chapter_discussion"
  | "story_group_post"
  | "author_group_post";

export type CommunityFeedItem = {
  id: string;
  kind: CommunityFeedItemKind;
  authorName: string;
  authorRole: CommunityRole;
  createdAt: string;
  title: string | null;
  body: string;
  storyId: string | null;
  storyTitle: string | null;
  storySlug: string | null;
  chapterLabel: string | null;
  authorChipName: string | null;
  authorId: string | null;
  groupType: CommunityPostTarget;
  groupId: string | null;
  groupLabel: string | null;
  voteCount: number;
  commentCount: number;
  isSpoiler: boolean;
  hotScore: number;
  pollOptions?: PollOption[];
  challengeMeta?: {
    deadlineLabel: string;
    entryCount: number;
    prizeLabel?: string;
  };
  featuredCommentPreview: string | null;
  threadPostId: string;
  sourcePostType?: CommunityPostType;
  isHidden?: boolean;
};

export type CommunityFeedPageResponse = {
  items: CommunityFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string | null;
};

/** @deprecated Use CommunityFeedItem — kept for desktop section feed */
export type EnrichedCommunityPost = {
  id: string;
  type: CommunityPostType;
  title: string;
  contentPreview: string;
  authorName: string;
  authorRole: CommunityRole;
  relatedStoryTitle: string | null;
  relatedStorySlug: string | null;
  storyId: string | null;
  createdAt: string;
  commentCount: number;
  voteCount: number;
  isSpoiler: boolean;
  hotScore: number;
  featuredCommentPreview: string | null;
  authorReplied: boolean;
  pollOptions?: PollOption[];
  isHidden?: boolean;
};

export type CommunityPostRecord = {
  id: string;
  type: CommunityPostType;
  user_id: string;
  story_id: string | null;
  chapter_id: string | null;
  author_id: string | null;
  group_type: CommunityPostTarget;
  group_id: string | null;
  title: string;
  body: string;
  spoiler: boolean;
  created_at: string;
  reaction_count: number;
  comment_count: number;
  share_count: number;
  pinned: boolean;
  metadata: Record<string, unknown> | null;
};

export type FeaturedComment = {
  id: string;
  quote: string;
  authorName: string;
  storyTitle: string;
  storySlug: string | null;
  chapterLabel?: string;
  postId: string;
};

export type DailyPoll = {
  id: string;
  question: string;
  options: PollOption[];
  postId?: string;
};

export type WeeklyChallenge = {
  id: string;
  title: string;
  prompt: string;
  deadlineLabel: string;
  entryCount: number;
  prizeLabel?: string;
  postId?: string;
};

export type AuthorReplyItem = {
  id: string;
  authorName: string;
  storyTitle: string;
  storySlug: string | null;
  postId: string;
};

/** @deprecated Use CommunityComposerMode */
export type CommunityComposerType = CommunityComposerMode;

export type CommunityGroupRecord = {
  id: string;
  type: CommunityGroupType;
  story_id: string | null;
  author_id: string | null;
  name: string;
  avatar_url: string | null;
  cover_url: string | null;
  member_count: number;
  post_count: number;
  hot_score: number;
};
