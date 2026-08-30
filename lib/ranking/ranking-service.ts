import type { DatabaseClient } from "@/lib/db/types";
import { loadOriginRankingInputBatch } from "@/lib/ranking/load-origin-ranking-inputs";
import {
  calculateOriginalStoryRankScore,
  calculateTranslatedStoryRankScore,
  isEligibleOriginalStory,
  isEligibleTranslatedStory
} from "@/lib/ranking/ranking-formulas";
import { activityIso } from "@/lib/ranking/ranking-period";
import type { OriginStoryEligibilityRow } from "@/lib/ranking/ranking-types";
import { reasonFromBoard } from "@/lib/ranking/score-formula";
import type { RankingBoardType, RankingScoreBreakdown, RankingTimeWindow } from "@/types/ranking-board";

export type OriginBoardStoryRow = {
  id: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  content_origin: string | null;
  monetization_policy: string | null;
  must_be_free_to_read: boolean | null;
  can_sell_chapters: boolean | null;
  can_sell_story_bundle: boolean | null;
  source_url: string | null;
  moderation_status: string | null;
  quality_status: string | null;
  status: string;
  visibility: string;
  authorUserId: string;
};

export type ScoredOriginStory = {
  storyId: string;
  authorUserId: string;
  score: number;
  breakdown: RankingScoreBreakdown;
  sortDate: string;
  usedFallbackMetrics: boolean;
};

function toEligibilityRow(row: OriginBoardStoryRow): OriginStoryEligibilityRow {
  return {
    id: row.id,
    content_origin: row.content_origin,
    status: row.status,
    visibility: row.visibility,
    moderation_status: row.moderation_status,
    quality_status: row.quality_status,
    monetization_policy: row.monetization_policy,
    must_be_free_to_read: row.must_be_free_to_read,
    can_sell_chapters: row.can_sell_chapters,
    can_sell_story_bundle: row.can_sell_story_bundle,
    source_url: row.source_url,
    authorUserId: row.authorUserId,
    authorActive: true
  };
}

/** Score stories with official Truyện sáng tác / Truyện dịch formulas. */
export async function scoreOriginBoardStories(
  db: DatabaseClient,
  rows: OriginBoardStoryRow[],
  boardType: Extract<RankingBoardType, "original_stories" | "translation_stories">,
  timeWindow: RankingTimeWindow
): Promise<ScoredOriginStory[]> {
  const eligibleRows = rows.filter((row) => {
    const eligibility = toEligibilityRow(row);
    if (boardType === "original_stories") {
      return isEligibleOriginalStory(eligibility).pass;
    }
    return isEligibleTranslatedStory(eligibility).pass;
  });

  if (eligibleRows.length === 0) return [];

  const storyMeta = new Map(
    eligibleRows.map((row) => [
      row.id,
      { sourceUrl: row.source_url, reportRate: 0, hideRate: 0 }
    ])
  );

  const metricsMap = await loadOriginRankingInputBatch(
    db,
    eligibleRows.map((row) => row.id),
    timeWindow,
    storyMeta
  );

  const scored: ScoredOriginStory[] = [];

  for (const row of eligibleRows) {
    const metrics = metricsMap.get(row.id);
    if (!metrics) continue;

    const publishedAt = row.published_at;
    const updatedAt = row.updated_at;

    const result =
      boardType === "original_stories"
        ? calculateOriginalStoryRankScore({
            storyId: row.id,
            publishedAt,
            updatedAt,
            period: timeWindow,
            metrics
          })
        : calculateTranslatedStoryRankScore({
            storyId: row.id,
            publishedAt,
            updatedAt,
            period: timeWindow,
            metrics
          });

    const reason = reasonFromBoard(boardType, result.breakdown);
    const sortDate =
      activityIso(publishedAt, updatedAt, row.created_at) ?? row.created_at ?? "";

    scored.push({
      storyId: row.id,
      authorUserId: row.authorUserId,
      score: Number.isFinite(result.score) ? result.score : 0,
      breakdown: { ...result.breakdown, reason },
      sortDate,
      usedFallbackMetrics: result.usedFallbackMetrics
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.sortDate.localeCompare(a.sortDate);
  });

  if (process.env.NODE_ENV === "development") {
    console.info("[ranking-service]", {
      boardType,
      timeWindow,
      input: rows.length,
      eligible: eligibleRows.length,
      scored: scored.length,
      fallbackCount: scored.filter((row) => row.usedFallbackMetrics).length
    });
  }

  return scored;
}
