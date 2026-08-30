import type { DatabaseClient } from "@/lib/db/types";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { hydrateRankingSnapshots } from "@/lib/ranking/hydrate-items";
import { getPublicStoryIdsForMainGenreSlug } from "@/lib/taxonomy/public-genres";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type {
  RankingBoardResult,
  RankingBoardType,
  RankingScoreBreakdown,
  RankingSnapshotRow,
  RankingTimeWindow
} from "@/types/ranking-board";

const EMPTY_BREAKDOWN: RankingScoreBreakdown = {
  completion_rate: 0,
  next_chapter_rate: 0,
  save_rate: 0,
  follow_rate: 0,
  unlock_rate: 0,
  freshness: 0,
  fairness: 0,
  report_penalty: 0,
  hide_penalty: 0,
  raw_score: 0
};

function buildFallbackSnapshots(
  storyIds: string[],
  boardType: RankingBoardType,
  timeWindow: RankingTimeWindow,
  offset: number
): RankingSnapshotRow[] {
  const snapshotAt = new Date().toISOString();
  return storyIds.map((storyId, index) => ({
    id: `taxonomy-fallback-${storyId}`,
    ranking_type: boardType,
    time_window: timeWindow,
    taxonomy_term_id: null,
    item_type: "story",
    item_id: storyId,
    story_id: storyId,
    author_user_id: null,
    rank_position: offset + index + 1,
    score: 0,
    score_breakdown: EMPTY_BREAKDOWN,
    snapshot_at: snapshotAt
  }));
}

/** Live board when ranking snapshots have no taxonomy_term_id for this slug. */
export async function getGenreStoriesBoardFromTaxonomy(
  db: DatabaseClient,
  params: {
    genreSlug: string;
    timeWindow: RankingTimeWindow;
    page: number;
    pageSize: number;
  }
): Promise<RankingBoardResult | null> {
  const storyIds = await getPublicStoryIdsForMainGenreSlug(
    db,
    params.genreSlug,
    500
  );

  if (!storyIds?.length) {
    return null;
  }

  const { data: stories } = await db
    .from("stories")
    .select("id, published_at")
    .in("id", storyIds)
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .order("published_at", { ascending: false });

  const orderedIds = (stories ?? []).map((row) => String(row.id));
  const totalCount = orderedIds.length;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / params.pageSize) : 0;
  const from = (params.page - 1) * params.pageSize;
  const pageIds = orderedIds.slice(from, from + params.pageSize);

  const rows = buildFallbackSnapshots(
    pageIds,
    "genre_stories",
    params.timeWindow,
    from
  );
  const items = await hydrateRankingSnapshots(db, rows, "genre_stories");

  return {
    boardType: "genre_stories",
    timeWindow: params.timeWindow,
    genreSlug: params.genreSlug,
    items,
    totalCount,
    page: params.page,
    pageSize: params.pageSize,
    totalPages,
    snapshotAt: rows[0]?.snapshot_at ?? null,
    error: null
  };
}
