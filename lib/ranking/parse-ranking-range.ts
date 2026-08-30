import type { RankingTimeWindow } from "@/types/ranking-board";
import { RANKING_TIME_WINDOWS } from "@/types/ranking-board";

/** Maps public URL aliases (?range=7d|30d|all) to internal time windows. */
export function parseRankingRangeParam(
  range: string | null,
  window: string | null
): RankingTimeWindow {
  const normalizedRange = range?.trim().toLowerCase();
  if (normalizedRange === "7d" || normalizedRange === "week") {
    return "week";
  }
  if (normalizedRange === "30d" || normalizedRange === "month") {
    return "month";
  }
  if (normalizedRange === "all" || normalizedRange === "all_time") {
    return "all_time";
  }
  if (normalizedRange === "1d" || normalizedRange === "day" || normalizedRange === "today") {
    return "day";
  }

  if (window && RANKING_TIME_WINDOWS.includes(window as RankingTimeWindow)) {
    return window as RankingTimeWindow;
  }

  return "week";
}

export function rankingRangeToQueryParam(window: RankingTimeWindow): string {
  if (window === "month") return "30d";
  if (window === "all_time") return "all";
  if (window === "day") return "1d";
  return "7d";
}
