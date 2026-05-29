export type FanScoreType = "story" | "author";

export type FanScoreEventKey =
  | "follow_story"
  | "follow_author"
  | "save_story"
  | "like_content"
  | "comment"
  | "reply_comment"
  | "vote_poll"
  | "chapter_reaction"
  | "share_clicked"
  | "share_copied"
  | "read_chapter";

export type FanScoreRecord = {
  id: string;
  userId: string;
  storyId: string | null;
  authorId: string | null;
  score: number;
  scoreType: FanScoreType;
  lastCalculatedAt: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type TopFanPerson = {
  id: string;
  rank: number;
  score: number;
  displayName: string;
  handle: string | null;
  avatarUrl: string | null;
  isCurrentUser: boolean;
};

export type TopFanHighlight = {
  id: string;
  rank: number;
  score: number;
  kind: FanScoreType;
  title: string;
  subtitle: string | null;
  href: string | null;
};
