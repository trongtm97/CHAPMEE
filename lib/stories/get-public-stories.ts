import { getStoryRankingScores } from "@/lib/ranking/getTrendingStories";
import { createPublicClient } from "@/lib/supabase/public-client";
import { getPublicGenresWithContent } from "@/lib/supabase/public-content";
import {
  CATALOG_STORY_ID_SELECT,
  CATALOG_STORY_SELECT,
  RANKING_CATALOG_LIMIT,
  clampPage,
  clampPageSize,
  escapeIlikePattern,
  getCatalogOffset,
  getTotalPages,
  isScoreSortedCatalog,
  type NormalizedCatalogParams
} from "@/lib/stories/story-catalog-query";
import type { StoryCatalogGenre, StoryCatalogSort, StoryCatalogStatus, StoryCatalogStory } from "@/types/story";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoryCatalogParams = {
  q?: string;
  genre?: string;
  sort?: StoryCatalogSort;
  status?: StoryCatalogStatus;
  page?: number;
  pageSize?: number;
};

export type StoryCatalogResult = {
  stories: StoryCatalogStory[];
  genres: StoryCatalogGenre[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  query: string;
  genre: string;
  sort: StoryCatalogSort;
  status: StoryCatalogStatus;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  cover_url: string | null;
  published_at: string | null;
  is_completed: boolean | null;
  creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
  genres: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
};

type StoryIdRow = {
  id: string;
  hook: string | null;
  title: string;
  short_description: string | null;
  is_completed: boolean | null;
  genres: { slug: string | null } | { slug: string | null }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function isQuickRead(row: { genreSlug: string | null; hook: string | null }) {
  return row.genreSlug === "truyen-ngan" || (row.hook?.length ?? 0) <= 100;
}

function normalizeSort(value: string | undefined): StoryCatalogSort {
  if (value === "hot" || value === "reads" || value === "new" || value === "completed" || value === "quick") {
    return value;
  }
  return "updated";
}

function normalizeStatus(value: string | undefined): StoryCatalogStatus {
  if (value === "ongoing" || value === "completed") {
    return value;
  }
  return "all";
}

function toCatalogGenres(genreRows: Array<{ slug: string; name: string; story_count: number }>): StoryCatalogGenre[] {
  return genreRows.map((item) => ({
    slug: item.slug,
    name: item.name,
    storyCount: item.story_count
  }));
}

function normalizeParams(params: StoryCatalogParams): NormalizedCatalogParams {
  return {
    q: params.q?.trim() ?? "",
    genre: params.genre?.trim() ?? "",
    sort: normalizeSort(params.sort),
    status: normalizeStatus(params.status),
    page: clampPage(params.page ?? 1),
    pageSize: clampPageSize(params.pageSize ?? 20)
  };
}

function mapStoryRow(row: StoryRow, scoreByStory: Map<string, number>): StoryCatalogStory {
  const creator = firstRelation(row.creator_profiles);
  const genreRelation = firstRelation(row.genres);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    hook: row.hook,
    shortDescription: row.short_description,
    coverUrl: row.cover_url,
    creatorName: creator?.pen_name ?? null,
    genreName: genreRelation?.name ?? null,
    genreSlug: genreRelation?.slug ?? null,
    publishedAt: row.published_at,
    isCompleted: Boolean(row.is_completed),
    score: scoreByStory.get(row.id) ?? 0
  };
}

function applyCatalogFiltersToIdRow(row: StoryIdRow, params: NormalizedCatalogParams) {
  const genreRelation = firstRelation(row.genres);
  const genreSlug = genreRelation?.slug ?? null;

  if (params.genre && genreSlug !== params.genre) {
    return false;
  }
  if (params.status === "completed" && !row.is_completed) {
    return false;
  }
  if (params.status === "ongoing" && row.is_completed) {
    return false;
  }
  if (params.sort === "quick" && !isQuickRead({ genreSlug, hook: row.hook })) {
    return false;
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    const matches =
      row.title.toLowerCase().includes(q) ||
      (row.hook ?? "").toLowerCase().includes(q) ||
      (row.short_description ?? "").toLowerCase().includes(q);
    if (!matches) {
      return false;
    }
  }

  return true;
}

function applyBaseStoryFilters<
  T extends {
    eq: (column: string, value: unknown) => T;
    in: (column: string, values: unknown[]) => T;
    or: (filters: string) => T;
    order: (column: string, options?: { ascending?: boolean }) => T;
  }
>(query: T, params: NormalizedCatalogParams) {
  let next = query.eq("visibility", "public").in("status", ["published", "approved"]);

  if (params.genre) {
    next = next.eq("genres.slug", params.genre);
  }
  if (params.status === "completed") {
    next = next.eq("is_completed", true);
  } else if (params.status === "ongoing") {
    next = next.eq("is_completed", false);
  }
  if (params.sort === "quick") {
    next = next.or("genres.slug.eq.truyen-ngan,and(hook.not.is.null)");
  }
  if (params.q) {
    const escaped = escapeIlikePattern(params.q);
    next = next.or(
      `title.ilike.%${escaped}%,hook.ilike.%${escaped}%,short_description.ilike.%${escaped}%`
    );
  }

  return next;
}

function applyDateSort<
  T extends {
    order: (column: string, options?: { ascending?: boolean }) => T;
  }
>(query: T, sort: StoryCatalogSort) {
  if (sort === "completed") {
    return query.order("is_completed", { ascending: false }).order("published_at", { ascending: false });
  }
  return query.order("published_at", { ascending: false });
}

async function fetchCatalogStoriesByIds(
  supabase: SupabaseClient,
  storyIds: string[],
  scoreByStory: Map<string, number>
) {
  if (storyIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("stories")
    .select(CATALOG_STORY_SELECT)
    .in("id", storyIds)
    .eq("visibility", "public")
    .in("status", ["published", "approved"]);

  if (error) {
    console.error("[catalog] hydrate stories failed", error);
    return [];
  }

  const rows = (data ?? []) as StoryRow[];
  const byId = new Map(rows.map((row) => [row.id, mapStoryRow(row, scoreByStory)]));
  return storyIds.map((id) => byId.get(id)).filter((story): story is StoryCatalogStory => Boolean(story));
}

async function filterRankedStoryIds(
  supabase: SupabaseClient,
  rankedIds: string[],
  params: NormalizedCatalogParams
) {
  const matched: string[] = [];
  const chunkSize = 200;

  for (let index = 0; index < rankedIds.length; index += chunkSize) {
    const chunk = rankedIds.slice(index, index + chunkSize);
    if (chunk.length === 0) {
      continue;
    }

    let query = supabase.from("stories").select(CATALOG_STORY_ID_SELECT).in("id", chunk);
    query = applyBaseStoryFilters(query, params);

    const { data, error } = await query;
    if (error) {
      console.error("[catalog] ranked id filter failed", error);
      continue;
    }

    for (const row of (data ?? []) as StoryIdRow[]) {
      if (applyCatalogFiltersToIdRow(row, params)) {
        matched.push(row.id);
      }
    }
  }

  const matchedSet = new Set(matched);
  return rankedIds.filter((id) => matchedSet.has(id));
}

async function getCatalogByScoreSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>
): Promise<StoryCatalogResult> {
  const rankedIds = [...scoreByStory.entries()]
    .sort((first, second) => second[1] - first[1])
    .map(([storyId]) => storyId);

  const filteredIds = await filterRankedStoryIds(supabase, rankedIds, params);
  const totalCount = filteredIds.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);
  const offset = getCatalogOffset(page, params.pageSize);
  const pageIds = filteredIds.slice(offset, offset + params.pageSize);
  const stories = await fetchCatalogStoriesByIds(supabase, pageIds, scoreByStory);

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status
  };
}

async function getCatalogByDateSort(
  supabase: SupabaseClient,
  params: NormalizedCatalogParams,
  genres: StoryCatalogGenre[],
  scoreByStory: Map<string, number>
): Promise<StoryCatalogResult> {
  const offset = getCatalogOffset(params.page, params.pageSize);
  const to = offset + params.pageSize - 1;

  let query = supabase.from("stories").select(CATALOG_STORY_SELECT, { count: "exact" });
  query = applyBaseStoryFilters(query, params);
  query = applyDateSort(query, params.sort);

  const { data, error, count } = await query.range(offset, to);
  if (error) {
    console.error("[catalog] stories query failed", error);
    return emptyCatalogResult(params, genres);
  }

  const rows = (data ?? []) as StoryRow[];
  const stories = rows.map((row) => mapStoryRow(row, scoreByStory));
  const totalCount = count ?? stories.length;
  const totalPages = getTotalPages(totalCount, params.pageSize);
  const page = Math.min(params.page, totalPages);

  return {
    stories,
    genres,
    totalCount,
    page,
    pageSize: params.pageSize,
    totalPages,
    query: params.q,
    genre: params.genre,
    sort: params.sort,
    status: params.status
  };
}

const emptyCatalogResult = (
  params: StoryCatalogParams,
  genres: StoryCatalogGenre[] = []
): StoryCatalogResult => {
  const normalized = normalizeParams(params);
  return {
    stories: [],
    genres,
    totalCount: 0,
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalPages: 1,
    query: normalized.q,
    genre: normalized.genre,
    sort: normalized.sort,
    status: normalized.status
  };
};

export async function getPublicStoriesCatalog(params: StoryCatalogParams = {}): Promise<StoryCatalogResult> {
  const normalized = normalizeParams(params);

  try {
    const supabase = createPublicClient();
    const genreRows = await getPublicGenresWithContent();
    const genres = toCatalogGenres(genreRows);
    const scoreByStory = await getStoryRankingScores("7d", RANKING_CATALOG_LIMIT);

    if (isScoreSortedCatalog(normalized.sort)) {
      return getCatalogByScoreSort(supabase, normalized, genres, scoreByStory);
    }

    return getCatalogByDateSort(supabase, normalized, genres, scoreByStory);
  } catch (error) {
    console.error("[catalog] getPublicStoriesCatalog failed", error);
    const genreRows = await getPublicGenresWithContent().catch(() => []);
    return emptyCatalogResult(params, toCatalogGenres(genreRows));
  }
}
