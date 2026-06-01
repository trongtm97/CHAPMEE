import type { SupabaseClient } from "@supabase/supabase-js";
import { hydrateRankingSnapshots } from "@/lib/ranking/hydrate-items";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import type {
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
  supabase: SupabaseClient,
  params: GetRankingBoardParams
): Promise<GenreBoardKeys> {
  const { resolveMainGenreTermBySlug } = await import(
    "@/lib/taxonomy/ranking-bridge"
  );

  const term = await resolveMainGenreTermBySlug(supabase, params.genreSlug);

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
  supabase: SupabaseClient,
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
  return getGenreStoriesBoardFromTaxonomy(supabase, {
    genreSlug: params.genreSlug,
    timeWindow: params.timeWindow,
    page,
    pageSize
  });
}

async function latestSnapshotAt(
  supabase: SupabaseClient,
  params: GetRankingBoardParams,
  keys: GenreBoardKeys
) {
  let query = supabase
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
  supabase: SupabaseClient,
  params: GetRankingBoardParams
): Promise<RankingBoardResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? RANKING_PAGE_SIZE;
  const genreKeys = await resolveGenreBoardKeys(supabase, params);

  try {
    const snapshotAt = await latestSnapshotAt(supabase, params, genreKeys);

    if (!snapshotAt) {
      const fallback = await tryGenreTaxonomyFallback(
        supabase,
        params,
        page,
        pageSize
      );
      if (fallback) {
        return fallback;
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

    let countQuery = supabase
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
      const fallback = await tryGenreTaxonomyFallback(
        supabase,
        params,
        page,
        pageSize
      );
      if (fallback) {
        return fallback;
      }
    }

    const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 0;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let dataQuery = supabase
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
    const items = await hydrateRankingSnapshots(supabase, rows, params.boardType);

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
  } catch (error) {
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
