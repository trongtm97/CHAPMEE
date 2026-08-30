export const RANKING_TIME_WINDOWS = ["day", "week", "month", "all_time"] as const;
export type RankingTimeWindow = (typeof RANKING_TIME_WINDOWS)[number];

export const RANKING_ITEM_TYPES = ["story", "author", "reel", "chapter"] as const;
export type RankingItemType = (typeof RANKING_ITEM_TYPES)[number];

export const RANKING_BOARD_TYPES = [
  "top_stories",
  "new_stories",
  "original_stories",
  "translation_stories",
  "new_authors",
  "genre_stories",
  "completed_stories",
  "rising_stories",
  "reels_read_through",
  "most_saved",
  "chapter_next_rate",
  "long_tail_quality",
  "boosted_stories"
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
  | "completed"
  | "boosted";

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
  hasPublishedAudio?: boolean;
  hasContinuousPlayback?: boolean;
  /** Auth user id of ranked author / story owner — for share owner tone. */
  ownerUserId?: string | null;
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
  /** Shown when live fallback widens period or metrics are still accumulating. */
  fallbackNote?: string | null;
  /** Shown when ranking uses live/fallback data instead of full metrics snapshots. */
  metricsNote?: string | null;
  error: string | null;
};

export type RankingUiTabId =
  | "today"
  | "week"
  | "month"
  | "new_stories"
  | "original_stories"
  | "translation_stories"
  | "new_authors"
  | "reels"
  | "genre"
  | "rising"
  | "completed"
  | "most_saved"
  | "chapter_next"
  | "long_tail"
  | "boosted";

export type RankingUiTab = {
  id: RankingUiTabId;
  slug: string;
  label: string;
  /** Mô tả ngắn cho độc giả (picker, UI). */
  tagline: string;
  /** SEO / Open Graph — cùng giọng độc giả. */
  description: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  showGenreFilter?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Tab visible in UI but snapshot pipeline not ready — show empty state, no fetch. */
  comingSoon?: boolean;
};

export const RANKING_UI_TABS: RankingUiTab[] = [
  {
    id: "today",
    slug: "hom-nay",
    label: "Hôm nay",
    tagline: "Truyện hot nhất trong 24 giờ",
    description: "Xem truyện được đọc và yêu thích nhiều nhất hôm nay trên ChapMee.",
    boardType: "top_stories",
    timeWindow: "day"
  },
  {
    id: "week",
    slug: "tuan",
    label: "Tuần",
    tagline: "Top truyện tuần này",
    description: "Bảng xếp hạng truyện nổi bật nhất trong tuần.",
    boardType: "top_stories",
    timeWindow: "week"
  },
  {
    id: "month",
    slug: "thang",
    label: "Tháng",
    tagline: "Dẫn đầu cả tháng",
    description: "Những truyện dẫn đầu trong 30 ngày qua.",
    boardType: "top_stories",
    timeWindow: "month"
  },
  {
    id: "new_stories",
    slug: "truyen-moi",
    label: "Truyện mới",
    tagline: "Tác phẩm mới đang được săn đón",
    description: "Truyện mới ra mắt và đang được độc giả đón đọc.",
    boardType: "new_stories",
    timeWindow: "week"
  },
  {
    id: "original_stories",
    slug: "truyen-sang-tac",
    label: "Truyện sáng tác",
    tagline: "Tác phẩm gốc được yêu thích",
    description: "Bảng xếp hạng truyện sáng tác trên ChapMee.",
    boardType: "original_stories",
    timeWindow: "week"
  },
  {
    id: "translation_stories",
    slug: "truyen-dich",
    label: "Truyện dịch",
    tagline: "Bản dịch được độc giả săn đón",
    description: "Bảng xếp hạng truyện dịch trên ChapMee.",
    boardType: "translation_stories",
    timeWindow: "week"
  },
  {
    id: "new_authors",
    slug: "tac-gia-moi",
    label: "Tác giả mới",
    tagline: "Tài năng mới nổi bật",
    description: "Tác giả mới được cộng đồng quan tâm.",
    boardType: "new_authors",
    timeWindow: "week"
  },
  {
    id: "reels",
    slug: "reels-keo-doc",
    label: "Reels",
    tagline: "Clip dẫn bạn vào truyện hay",
    description: "Reels giúp độc giả khám phá và đọc tiếp truyện.",
    boardType: "reels_read_through",
    timeWindow: "week"
  },
  {
    id: "genre",
    slug: "theo-the-loai",
    label: "Theo thể loại",
    tagline: "Top theo thể loại bạn chọn",
    description: "Xếp hạng truyện theo từng thể loại.",
    boardType: "genre_stories",
    timeWindow: "week",
    showGenreFilter: true
  },
  {
    id: "rising",
    slug: "dang-len",
    label: "Đang lên",
    tagline: "Truyện tăng tốc mạnh",
    description: "Truyện đang leo hạng nhanh trên ChapMee.",
    boardType: "rising_stories",
    timeWindow: "week"
  },
  {
    id: "completed",
    slug: "hoan-thanh",
    label: "Hoàn thành",
    tagline: "Trọn bộ được yêu thích",
    description: "Truyện đã hoàn thành được độc giả đánh giá cao.",
    boardType: "completed_stories",
    timeWindow: "week"
  },
  {
    id: "most_saved",
    slug: "luu-nhieu",
    label: "Lưu nhiều",
    tagline: "Được thêm vào tủ sách nhiều nhất",
    description: "Truyện được lưu vào thư viện nhiều nhất.",
    boardType: "most_saved",
    timeWindow: "week"
  },
  {
    id: "chapter_next",
    slug: "doc-tiep-cao",
    label: "Đọc tiếp cao",
    tagline: "Khó dừng ở một chương",
    description: "Chương khiến độc giả muốn đọc tiếp ngay.",
    boardType: "chapter_next_rate",
    timeWindow: "week"
  },
  {
    id: "long_tail",
    slug: "giu-chan-tot",
    label: "Giữ chân tốt",
    tagline: "Đọc lâu, quay lại nhiều",
    description: "Truyện giữ chân độc giả bền bỉ theo thời gian.",
    boardType: "long_tail_quality",
    timeWindow: "week"
  },
  {
    id: "boosted",
    slug: "duoc-de-cu",
    label: "Được đề cử",
    tagline: "Những truyện được cộng đồng ChapMee đề cử nhiều nhất.",
    description:
      "Khám phá những truyện được cộng đồng ChapMee đề cử nhiều nhất, cập nhật theo tuần, tháng và toàn thời gian.",
    boardType: "boosted_stories",
    timeWindow: "week",
    emptyTitle: "Chưa có truyện nào được đề cử",
    emptyDescription:
      "Khi người đọc bắt đầu đề cử truyện yêu thích, bảng xếp hạng sẽ được cập nhật tại đây."
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
