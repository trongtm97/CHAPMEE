import type { RankingBoardType, RankingReasonBadge, RankingScoreBreakdown } from "@/types/ranking-board";

export function reasonBadgeFromBoard(
  boardType: RankingBoardType,
  breakdown: RankingScoreBreakdown
): RankingReasonBadge | null {
  switch (boardType) {
    case "new_stories":
      return "new_story";
    case "new_authors":
      return "new_author";
    case "rising_stories":
      return "rising";
    case "reels_read_through":
      return "reels_pull";
    case "most_saved":
      return "most_saved";
    case "long_tail_quality":
      return "long_tail";
    case "completed_stories":
      return "completed";
    case "boosted_stories":
      return "boosted";
    case "chapter_next_rate":
      return breakdown.next_chapter_rate >= 0.45 ? "high_next_chapter" : null;
    default:
      if (breakdown.next_chapter_rate >= 0.55) return "high_next_chapter";
      if (breakdown.save_rate >= 0.45) return "most_saved";
      if (breakdown.freshness >= 0.75) return "new_story";
      return null;
  }
}

export const REASON_BADGE_LABELS: Record<RankingReasonBadge, string> = {
  high_next_chapter: "Đọc tiếp cao",
  rising: "Đang lên",
  new_author: "Tác giả mới",
  new_story: "Truyện mới",
  most_saved: "Lưu nhiều",
  reels_pull: "Reels kéo đọc",
  long_tail: "Giữ chân tốt",
  completed: "Hoàn thành",
  boosted: "Được đề cử"
};
