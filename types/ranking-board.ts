export const RANKING_TIME_WINDOWS = ["day", "week", "month", "all_time"] as const;
export type RankingTimeWindow = (typeof RANKING_TIME_WINDOWS)[number];

export const RANKING_ITEM_TYPES = ["story", "author", "reel", "chapter"] as const;
export type RankingItemType = (typeof RANKING_ITEM_TYPES)[number];

export const RANKING_BOARD_TYPES = [
  "top_stories",
  "new_stories",
  "new_authors",
  "genre_stories",
  "completed_stories",
  "rising_stories",
  "reels_read_through",
  "most_saved",
  "chapter_next_rate",
  "long_tail_quality"
] as const;

export type RankingBoardType = (typeof RANKING_BOARD_TYPES)[number];

export type RankingScoreBreakdown = {
  completion_rate: number;
  next_chapter_rate: number;
  save_rate: number;
  follow_rate: number;
  unlock_rate: number;
  freshness: number;
  fairness: number;
  report_penalty: number;
  hide_penalty: number;
  raw_score: number;
  reason?: string;
};

export type RankingSnapshotRow = {
  id: string;
  ranking_type: RankingBoardType;
  time_window: RankingTimeWindow;
  taxonomy_term_id: string | null;
  item_type: RankingItemType;
  item_id: string;
  story_id: string | null;
  author_user_id: string | null;
  rank_position: number;
  score: number;
  score_breakdown: RankingScoreBreakdown;
  snapshot_at: string;
};

export type RankingReasonBadge =
  | "high_next_chapter"
  | "rising"
  | "new_author"
  | "new_story"
  | "most_saved"
  | "reels_pull"
  | "long_tail"
  | "completed";

export type RankingBoardItem = {
  rank: number;
  itemType: RankingItemType;
  id: string;
  title: string;
  slug: string | null;
  publicCode?: string | null;
  href: string;
  coverUrl: string | null;
  subtitle: string | null;
  description: string | null;
  genreName: string | null;
  genreSlug?: string | null;
  authorDisplayName: string | null;
  authorUsername: string | null;
  score: number;
  scoreBreakdown: RankingScoreBreakdown;
  reasonBadge: RankingReasonBadge | null;
  statsLine: string | null;
};

export type RankingBoardResult = {
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  genreSlug: string | null;
  items: RankingBoardItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  snapshotAt: string | null;
  error: string | null;
};

export type RankingUiTabId =
  | "today"
  | "week"
  | "month"
  | "new_stories"
  | "new_authors"
  | "reels"
  | "genre"
  | "rising"
  | "completed"
  | "most_saved"
  | "chapter_next"
  | "long_tail";

export type RankingUiTab = {
  id: RankingUiTabId;
  slug: string;
  label: string;
  description: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  showGenreFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
};

export const RANKING_UI_TABS: RankingUiTab[] = [
  {
    id: "today",
    slug: "hom-nay",
    label: "Hôm nay",
    description: "Truyện nổi bật trong 24 giờ qua — dựa trên chất lượng đọc, không chỉ lượt xem.",
    boardType: "top_stories",
    timeWindow: "day"
  },
  {
    id: "week",
    slug: "tuan",
    label: "Tuần",
    description: "Top truyện tuần này với công thức cân bằng giữa giữ chân, lưu và đọc tiếp.",
    boardType: "top_stories",
    timeWindow: "week"
  },
  {
    id: "month",
    slug: "thang",
    label: "Tháng",
    description: "Truyện dẫn đầu trong 30 ngày qua.",
    boardType: "top_stories",
    timeWindow: "month"
  },
  {
    id: "new_stories",
    slug: "truyen-moi",
    label: "Truyện mới",
    description: "Truyện mới xuất bản gần đây đang được đọc tích cực.",
    boardType: "new_stories",
    timeWindow: "week"
  },
  {
    id: "new_authors",
    slug: "tac-gia-moi",
    label: "Tác giả mới",
    description: "Tác giả mới đang tạo dấu ấn với độc giả.",
    boardType: "new_authors",
    timeWindow: "week"
  },
  {
    id: "reels",
    slug: "reels-keo-doc",
    label: "Reels kéo đọc",
    description: "Reels chuyển đổi tốt nhất sang đọc truyện.",
    boardType: "reels_read_through",
    timeWindow: "week"
  },
  {
    id: "genre",
    slug: "theo-the-loai",
    label: "Theo thể loại",
    description: "Xếp hạng theo thể loại bạn chọn.",
    boardType: "genre_stories",
    timeWindow: "week",
    showGenreFilter: true
  },
  {
    id: "rising",
    slug: "dang-len",
    label: "Đang lên",
    description: "Truyện tăng trưởng nhanh so với tuần trước.",
    boardType: "rising_stories",
    timeWindow: "week"
  },
  {
    id: "completed",
    slug: "hoan-thanh",
    label: "Hoàn thành",
    description: "Truyện đã hoàn thành được yêu thích nhất.",
    boardType: "completed_stories",
    timeWindow: "week"
  },
  {
    id: "most_saved",
    slug: "luu-nhieu",
    label: "Lưu nhiều",
    description: "Truyện được lưu vào thư viện nhiều nhất.",
    boardType: "most_saved",
    timeWindow: "week"
  },
  {
    id: "chapter_next",
    slug: "doc-tiep-cao",
    label: "Đọc tiếp cao",
    description: "Chương có tỷ lệ đọc chương tiếp cao nhất.",
    boardType: "chapter_next_rate",
    timeWindow: "week"
  },
  {
    id: "long_tail",
    slug: "giu-chan-tot",
    label: "Giữ chân tốt",
    description: "Truyện ít hiển thị nhưng giữ chân độc giả rất tốt.",
    boardType: "long_tail_quality",
    timeWindow: "week"
  }
];

export function findRankingTabBySlug(slug: string | undefined) {
  if (!slug) return RANKING_UI_TABS.find((tab) => tab.id === "week") ?? RANKING_UI_TABS[1];
  return (
    RANKING_UI_TABS.find((tab) => tab.slug === slug) ??
    RANKING_UI_TABS.find((tab) => tab.id === slug) ??
    RANKING_UI_TABS[1]
  );
}

export function findRankingTabById(id: RankingUiTabId) {
  return RANKING_UI_TABS.find((tab) => tab.id === id) ?? RANKING_UI_TABS[1];
}
