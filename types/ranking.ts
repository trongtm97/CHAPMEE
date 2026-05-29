export type RankingTimePeriod = "today" | "week" | "all";

export type RankingCategory =
  | "hot_stories"
  | "rising_stories"
  | "top_authors"
  | "top_fans";

export type RankingCategoryMeta = {
  id: RankingCategory;
  label: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export type StoryRankingItem = {
  id: string;
  rank: number;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  genreName: string | null;
  creatorName: string | null;
  creatorId: string | null;
  score: number;
};

export type AuthorRankingItem = {
  id: string;
  rank: number;
  userId: string;
  penName: string;
  avatarUrl: string | null;
  followerCount: number;
  totalReads: number;
  storyCount: number;
  score: number;
};

export type FanRankingItem = {
  id: string;
  rank: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  totalScore: number;
  isCurrentUser: boolean;
};

export type EarningAuthorRankingItem = {
  id: string;
  rank: number;
  userId: string;
  penName: string;
  avatarUrl: string | null;
  grossRevenue: number;
  supporterCount: number;
  paidReaderCount: number;
};

export type SupporterRankingItem = {
  id: string;
  rank: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  isAnonymous: boolean;
  totalSupported: number;
  supportCount: number;
};

export const RANKING_TABS: RankingCategoryMeta[] = [
  {
    id: "hot_stories",
    label: "Truyện hot",
    description: "Truyện có nhiều tương tác nhất gần đây."
  },
  {
    id: "rising_stories",
    label: "Mới nổi",
    description: "Truyện mới tăng trưởng nhanh."
  },
  {
    id: "top_authors",
    label: "Tác giả",
    description: "Tác giả nổi bật theo lượt đọc và tương tác."
  },
  {
    id: "top_fans",
    label: "Top Fan",
    description: "Người đọc nổi bật theo tương tác chất lượng.",
    emptyTitle: "Chưa có dữ liệu Top Fan",
    emptyDescription:
      "Khi độc giả bắt đầu tương tác với truyện và tác giả, bảng xếp hạng fan sẽ xuất hiện tại đây."
  }
];

export const TIME_PERIODS: { id: RankingTimePeriod; label: string }[] = [
  { id: "today", label: "Hôm nay" },
  { id: "week", label: "Tuần này" },
  { id: "all", label: "Tất cả" }
];
