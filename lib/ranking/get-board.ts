import type { DatabaseClient } from "@/lib/db/types";
import { hydrateRankingSnapshots } from "@/lib/ranking/hydrate-items";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  RankingBoardItem,
  RankingBoardResult,
  RankingBoardType,
  RankingSnapshotRow,
  RankingTimeWindow
} from "@/types/ranking-board";

export const RANKING_PAGE_SIZE = 20;

export type GetRankingBoardParams = {
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  genreId?: string | null;
  genreSlug?: string | null;
  page?: number;
  pageSize?: number;
};

type GenreBoardKeys = {
  taxonomyTermId: string | null;
};

async function resolveGenreBoardKeys(
  db: DatabaseClient,
  params: GetRankingBoardParams
): Promise<GenreBoardKeys> {
  const { resolveMainGenreTermBySlug } = await import(
    "@/lib/taxonomy/ranking-bridge"
  );

  const term = await resolveMainGenreTermBySlug(db, params.genreSlug);

  return {
    taxonomyTermId: term?.termId ?? params.genreId ?? null
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyGenreSnapshotFilter(query: any, boardType: RankingBoardType, keys: GenreBoardKeys) {
  if (boardType !== "genre_stories") {
    return query.is("taxonomy_term_id", null);
  }

  if (keys.taxonomyTermId) {
    return query.eq("taxonomy_term_id", keys.taxonomyTermId);
  }

  return query.is("taxonomy_term_id", null);
}

async function tryGenreTaxonomyFallback(
  db: DatabaseClient,
  params: GetRankingBoardParams,
  page: number,
  pageSize: number
) {
  if (params.boardType !== "genre_stories" || !params.genreSlug) {
    return null;
  }

  const { getGenreStoriesBoardFromTaxonomy } = await import(
    "@/lib/ranking/taxonomy-genre-board-fallback"
  );
  return getGenreStoriesBoardFromTaxonomy(db, {
    genreSlug: params.genreSlug,
    timeWindow: params.timeWindow,
    page,
    pageSize
  });
}

async function tryLiveBoardFallback(
  db: DatabaseClient,
  params: GetRankingBoardParams,
  page: number,
  pageSize: number
) {
  const { getLiveRankingBoardFallback } = await import(
    "@/lib/ranking/live-board-fallback"
  );
  return getLiveRankingBoardFallback(db, params, page, pageSize);
}

function logRankingBoard(message: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[ranking-board]", message, data);
}

function emptyRankingBoard(
  params: GetRankingBoardParams,
  page: number,
  pageSize: number,
  fallbackNote?: string | null
): RankingBoardResult {
  return {
    boardType: params.boardType,
    timeWindow: params.timeWindow,
    genreSlug: params.genreSlug ?? null,
    items: [],
    totalCount: 0,
    page,
    pageSize,
    totalPages: 0,
    snapshotAt: null,
    fallbackNote: fallbackNote ?? null,
    error: null
  };
}

async function attachAudioToItems(items: RankingBoardItem[]) {
  const storyIds = items
    .filter((item) => item.itemType === "story")
    .map((item) => item.id);
  const { getStoryAudioCardSummaryMap } = await import("@/src/lib/audio/audio-summary");
  const audioMap = await getStoryAudioCardSummaryMap(storyIds);
  return items.map((item) => {
    if (item.itemType !== "story") {
      return item;
    }
    const audio = audioMap.get(item.id);
    return {
      ...item,
      hasPublishedAudio: audio?.hasPublishedAudio ?? false,
      hasContinuousPlayback: audio?.hasContinuousPlayback ?? false
    };
  });
}

async function latestSnapshotAt(
  db: DatabaseClient,
  params: GetRankingBoardParams,
  keys: GenreBoardKeys
) {
  let query = db
    .from("ranking_snapshots")
    .select("snapshot_at")
    .eq("ranking_type", params.boardType)
    .eq("time_window", params.timeWindow)
    .order("snapshot_at", { ascending: false })
    .limit(1);

  query = applyGenreSnapshotFilter(query, params.boardType, keys);

  const { data, error } = await query.maybeSingle();
  if (error && !isMissingSchemaError(error)) throw error;
  return (data?.snapshot_at as string) ?? null;
}

export async function getRankingBoard(
  db: DatabaseClient,
  params: GetRankingBoardParams
): Promise<RankingBoardResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? RANKING_PAGE_SIZE;

  try {
    const genreKeys = await resolveGenreBoardKeys(db, params);

    if (params.boardType === "boosted_stories") {
      const { getBoostedStoriesBoard } = await import(
        "@/lib/ranking/boosted-stories-board"
      );
      const boostedBoard = await getBoostedStoriesBoard(db, {
        timeWindow: params.timeWindow,
        page,
        pageSize
      });
      logRankingBoard("boosted stories live board", {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        count: boostedBoard.totalCount
      });
      const items = await attachAudioToItems(boostedBoard.items);
      return { ...boostedBoard, items };
    }

    if (
      params.boardType === "original_stories" ||
      params.boardType === "translation_stories"
    ) {
      const officialBoard = await tryLiveBoardFallback(
        db,
        params,
        page,
        pageSize
      );
      logRankingBoard("official origin board", {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        count: officialBoard?.totalCount ?? 0
      });
      if (officialBoard) {
        const items = await attachAudioToItems(officialBoard.items);
        return { ...officialBoard, items };
      }

      return {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        genreSlug: params.genreSlug ?? null,
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        snapshotAt: null,
        error: null
      };
    }

    const snapshotAt = await latestSnapshotAt(db, params, genreKeys);

    if (!snapshotAt) {
      const genreFallback = await tryGenreTaxonomyFallback(
        db,
        params,
        page,
        pageSize
      );
      if (genreFallback) {
        return genreFallback;
      }

      const liveFallback = await tryLiveBoardFallback(
        db,
        params,
        page,
        pageSize
      );
      logRankingBoard("no snapshot — live fallback", {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        count: liveFallback?.totalCount ?? 0
      });
      if (liveFallback) {
        const items = await attachAudioToItems(liveFallback.items);
        return { ...liveFallback, items };
      }

      return {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        genreSlug: params.genreSlug ?? null,
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        snapshotAt: null,
        error: null
      };
    }

    let countQuery = db
      .from("ranking_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("ranking_type", params.boardType)
      .eq("time_window", params.timeWindow)
      .eq("snapshot_at", snapshotAt);

    countQuery = applyGenreSnapshotFilter(
      countQuery,
      params.boardType,
      genreKeys
    );

    const { count, error: countError } = await countQuery;
    if (countError && !isMissingSchemaError(countError)) throw countError;

    const totalCount = count ?? 0;

    if (totalCount === 0) {
      const genreFallback = await tryGenreTaxonomyFallback(
        db,
        params,
        page,
        pageSize
      );
      if (genreFallback) {
        return genreFallback;
      }

      const liveFallback = await tryLiveBoardFallback(
        db,
        params,
        page,
        pageSize
      );
      logRankingBoard("empty snapshot count — live fallback", {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        count: liveFallback?.totalCount ?? 0
      });
      if (liveFallback) {
        const items = await attachAudioToItems(liveFallback.items);
        return { ...liveFallback, items };
      }
    }

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let dataQuery = db
      .from("ranking_snapshots")
      .select("*")
      .eq("ranking_type", params.boardType)
      .eq("time_window", params.timeWindow)
      .eq("snapshot_at", snapshotAt)
      .order("rank_position", { ascending: true })
      .range(from, to);

    dataQuery = applyGenreSnapshotFilter(
      dataQuery,
      params.boardType,
      genreKeys
    );

    const { data, error } = await dataQuery;
    if (error && !isMissingSchemaError(error)) throw error;

    const rows = (data ?? []) as RankingSnapshotRow[];
    const hydrated = await hydrateRankingSnapshots(db, rows, params.boardType);

    if (hydrated.length === 0 && rows.length > 0) {
      const liveFallback = await tryLiveBoardFallback(
        db,
        params,
        page,
        pageSize
      );
      logRankingBoard("hydrate empty — live fallback", {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        snapshotRows: rows.length,
        count: liveFallback?.totalCount ?? 0
      });
      if (liveFallback) {
        const items = await attachAudioToItems(liveFallback.items);
        return { ...liveFallback, items };
      }
    }

    const items = await attachAudioToItems(hydrated);
    logRankingBoard("snapshot board", {
      boardType: params.boardType,
      timeWindow: params.timeWindow,
      totalCount,
      itemCount: items.length
    });

    return {
      boardType: params.boardType,
      timeWindow: params.timeWindow,
      genreSlug: params.genreSlug ?? null,
      items,
      totalCount,
      page,
      pageSize,
      totalPages,
      snapshotAt,
      error: null
    };
  } catch (error: any) {
    if (isMissingSchemaError(error)) {
      return emptyRankingBoard(
        params,
        page,
        pageSize,
        "Ranking data is not ready yet. It will appear after migrations and snapshots finish."
      );
    }

    return emptyRankingBoard(
      params,
      page,
      pageSize,
      "Ranking data is temporarily unavailable. The page will update when data recovers."
    );

    if (isMissingSchemaError(error)) {
      return {
        boardType: params.boardType,
        timeWindow: params.timeWindow,
        genreSlug: params.genreSlug ?? null,
        items: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        snapshotAt: null,
        error: "Bảng xếp hạng chưa sẵn sàng. Vui lòng thử lại sau."
      };
    }

    return {
      boardType: params.boardType,
      timeWindow: params.timeWindow,
      genreSlug: params.genreSlug ?? null,
      items: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
      snapshotAt: null,
      error: error instanceof Error ? error.message : "Không tải được bảng xếp hạng."
    };
  }
}
