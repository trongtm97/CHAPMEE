import "server-only";

import type { DatabaseClient } from "@/lib/db/types";
import { getRecommendedStoriesRankingBoard } from "@/lib/recommendations/ranking";
import type { RankingBoardResult, RankingTimeWindow } from "@/types/ranking-board";

/** Live "Được đề cử" board — delegates to recommendation ticket totals. */
export async function getBoostedStoriesBoard(
  db: DatabaseClient,
  input: {
    timeWindow: RankingTimeWindow;
    page?: number;
    pageSize?: number;
  }
): Promise<RankingBoardResult> {
  return getRecommendedStoriesRankingBoard(db, input);
}
