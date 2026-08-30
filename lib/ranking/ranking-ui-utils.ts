import type {
  RankingBoardItem,
  RankingBoardType,
  RankingTimeWindow,
  RankingUiTab,
  RankingUiTabId
} from "@/types/ranking-board";
import { REASON_BADGE_LABELS } from "@/lib/ranking/reason-badges";

export type RankingBoardShareProps = {
  boardLabel: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  periodLabel: string;
};

export type RankingSelectorGroup = {
  id: string;
  label: string;
  tabIds: RankingUiTabId[];
};

/** All ranking boards — visible in selector (no hidden "more" menu). */
export const RANKING_SELECTOR_GROUPS: RankingSelectorGroup[] = [
  {
    id: "time",
    label: "Thời gian",
    tabIds: ["today", "week", "month"]
  },
  {
    id: "content",
    label: "Nội dung",
    tabIds: ["new_stories", "original_stories", "translation_stories", "completed"]
  },
  {
    id: "growth",
    label: "Tăng trưởng",
    tabIds: ["rising", "most_saved", "chapter_next", "long_tail", "boosted"]
  },
  {
    id: "community",
    label: "Cộng đồng",
    tabIds: ["new_authors", "reels", "genre"]
  }
];

export const RANKING_ALL_TAB_IDS: RankingUiTabId[] = RANKING_SELECTOR_GROUPS.flatMap(
  (group) => group.tabIds
);

export const RANKING_METRICS_ACCUMULATING_NOTE =
  "Dữ liệu đang tích lũy, tạm xếp theo cập nhật và tương tác hiện có.";

export const RANKING_EMPTY_SUGGESTIONS: RankingUiTabId[] = ["today", "new_stories", "rising"];

export type PeriodOption = {
  value: RankingTimeWindow;
  label: string;
};

export const RANKING_PERIOD_OPTIONS: PeriodOption[] = [
  { value: "day", label: "Hôm nay" },
  { value: "week", label: "7 ngày" },
  { value: "month", label: "30 ngày" },
  { value: "all_time", label: "Tất cả" }
];

const FIXED_WINDOW_TAB_IDS = new Set<RankingUiTabId>(["today", "week", "month"]);

export function supportsPeriodFilter(tabId: RankingUiTabId): boolean {
  return !FIXED_WINDOW_TAB_IDS.has(tabId);
}

/** Period chips for "Được đề cử" — 7d / 30d / all (no "Hôm nay"). */
export const BOOSTED_RANKING_PERIOD_OPTIONS: PeriodOption[] = [
  { value: "week", label: "7 ngày" },
  { value: "month", label: "30 ngày" },
  { value: "all_time", label: "Tất cả" }
];

export function formatRankingSnapshotTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function getPrimaryMetricLabel(
  item: RankingBoardItem,
  boardType: RankingBoardType
): string | null {
  const breakdown = item.scoreBreakdown;
  const pct = (value: number) => `${Math.round(value * 100)}%`;

  switch (boardType) {
    case "most_saved":
      return breakdown.save_rate > 0 ? `Lưu ${pct(breakdown.save_rate)}` : null;
    case "chapter_next_rate":
      return breakdown.next_chapter_rate > 0
        ? `Đọc tiếp ${pct(breakdown.next_chapter_rate)}`
        : null;
    case "long_tail_quality":
      return breakdown.completion_rate > 0
        ? `Hoàn thành ${pct(breakdown.completion_rate)}`
        : null;
    case "boosted_stories":
      if (item.statsLine) return item.statsLine;
      if (breakdown.reason?.includes("Phiếu đề cử")) {
        return breakdown.reason;
      }
      return item.score > 0
        ? `${Math.round(item.score).toLocaleString("vi-VN")} Phiếu đề cử`
        : null;
    default:
      if (item.statsLine) return item.statsLine;
      if (breakdown.next_chapter_rate > 0) {
        return `Đọc tiếp ${pct(breakdown.next_chapter_rate)}`;
      }
      if (breakdown.save_rate > 0) {
        return `Lưu ${pct(breakdown.save_rate)}`;
      }
      return item.reasonBadge ? REASON_BADGE_LABELS[item.reasonBadge] : null;
  }
}

export function rankingTabHref(tab: RankingUiTab) {
  if (tab.id === "week") {
    return "/bang-xep-hang/tuan";
  }
  return `/bang-xep-hang/${tab.slug}`;
}

export function getItemCtaLabel(
  itemType: RankingBoardItem["itemType"],
  boardType?: RankingBoardType
) {
  if (itemType === "author") return "Xem hồ sơ";
  if (itemType === "reel") return "Xem reel";
  if (itemType === "chapter") return "Xem chương";
  if (boardType === "boosted_stories") return "Đọc ngay";
  return "Xem truyện";
}
