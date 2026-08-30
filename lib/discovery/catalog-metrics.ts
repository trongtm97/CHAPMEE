import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { NormalizedCatalogParams } from "@/lib/stories/story-catalog-query";
import { escapeIlikePattern } from "@/lib/stories/story-catalog-query";
import type { DatabaseClient } from "@/lib/db/types";

const PUBLIC_STATUSES = [...publicContentStatuses];
const CATALOG_CANDIDATE_LIMIT = 5000;
const NEW_CHAPTER_DAYS = 14;

export async function loadPublicCatalogCandidateIds(
  db: DatabaseClient,
  params: NormalizedCatalogParams,
  storyIdFilter: string[] | null
): Promise<string[]> {
  if (storyIdFilter) {
    return storyIdFilter.slice(0, CATALOG_CANDIDATE_LIMIT);
  }

  let query = db
    .from("stories")
    .select("id")
    .eq("visibility", "public")
    .in("status", PUBLIC_STATUSES)
    .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(CATALOG_CANDIDATE_LIMIT);

  if (params.genre) {
    const { getPublicStoryIdsForMainGenreSlug } = await import(
      "@/lib/taxonomy/public-genres"
    );
    const genreStoryIds = await getPublicStoryIdsForMainGenreSlug(
      db,
      params.genre,
      CATALOG_CANDIDATE_LIMIT
    );
    if (!genreStoryIds || genreStoryIds.length === 0) {
      return [];
    }
    query = query.in("id", genreStoryIds);
  }
  if (params.status === "completed") {
    query = query.eq("is_completed", true);
  } else if (params.status === "ongoing") {
    query = query.eq("is_completed", false);
  }
  if (params.q) {
    const escaped = escapeIlikePattern(params.q);
    query = query.or(
      `title.ilike.%${escaped}%,hook.ilike.%${escaped}%,short_description.ilike.%${escaped}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[catalog-metrics] load candidates failed", error);
    return [];
  }
  return (data ?? []).map((row) => String(row.id));
}

export async function getEpisodeCountByStoryId(
  db: DatabaseClient,
  storyIds: string[]
) {
  const counts = new Map<string, number>();
  if (storyIds.length === 0) return counts;

  const chunkSize = 500;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data, error } = await db.rpc("get_public_story_episode_counts", {
      input_story_ids: chunk
    });
    if (!error && data) {
      for (const row of data as Array<{ story_id: string; episode_count: number }>) {
        counts.set(String(row.story_id), Number(row.episode_count ?? 0));
      }
      continue;
    }

    const { data: fallback } = await db
      .from("episodes")
      .select("story_id")
      .in("story_id", chunk)
      .in("status", PUBLIC_STATUSES);

    for (const row of fallback ?? []) {
      const id = String(row.story_id);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

export async function getSaveCountByStoryId(
  db: DatabaseClient,
  storyIds: string[]
) {
  const counts = new Map<string, number>();
  if (storyIds.length === 0) return counts;

  const chunkSize = 500;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data, error } = await db.rpc("get_public_story_save_counts", {
      input_story_ids: chunk
    });
    if (error) {
      console.error("[catalog-metrics] save counts rpc failed", error);
      continue;
    }
    for (const row of (data ?? []) as Array<{ story_id: string; save_count: number }>) {
      counts.set(String(row.story_id), Number(row.save_count ?? 0));
    }
  }
  return counts;
}

export async function getFullAccessPriceByStoryId(
  db: DatabaseClient,
  storyIds: string[]
) {
  const prices = new Map<string, number | null>();
  if (storyIds.length === 0) return prices;

  const chunkSize = 400;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data } = await db
      .from("story_monetization_settings")
      .select("story_id, full_access_enabled, full_access_price_coin")
      .in("story_id", chunk);

    for (const row of data ?? []) {
      const id = String(row.story_id);
      const enabled = Boolean(row.full_access_enabled);
      const price =
        row.full_access_price_coin != null ? Number(row.full_access_price_coin) : null;
      prices.set(id, enabled && price != null && price > 0 ? price : null);
    }
  }
  return prices;
}

export async function getStoryIdsWithRecentEpisodes(
  db: DatabaseClient,
  days = NEW_CHAPTER_DAYS,
  candidateIds?: string[] | null
) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  let query = db
    .from("episodes")
    .select("story_id, stories!inner(id)")
    .in("status", PUBLIC_STATUSES)
    .eq("stories.visibility", "public")
    .in("stories.status", PUBLIC_STATUSES)
    .gte("published_at", sinceIso)
    .limit(8000);

  if (candidateIds && candidateIds.length > 0) {
    query = query.in("story_id", candidateIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[catalog-metrics] recent episodes failed", error);
    return [];
  }
  return [...new Set((data ?? []).map((row) => String(row.story_id)))];
}

export function sortStoryIdsByNumericMap(
  storyIds: string[],
  values: Map<string, number>,
  direction: "asc" | "desc"
) {
  return [...storyIds].sort((a, b) => {
    const av = values.get(a) ?? 0;
    const bv = values.get(b) ?? 0;
    return direction === "asc" ? av - bv : bv - av;
  });
}

export async function getMinPaidChapterPriceByStoryId(
  db: DatabaseClient,
  storyIds: string[]
) {
  const prices = new Map<string, number | null>();
  if (storyIds.length === 0) return prices;

  const chunkSize = 200;
  for (let i = 0; i < storyIds.length; i += chunkSize) {
    const chunk = storyIds.slice(i, i + chunkSize);
    const { data } = await db
      .from("chapter_monetization_settings")
      .select("coin_price, is_paid, episodes!inner(story_id)")
      .in("episodes.story_id", chunk)
      .eq("is_paid", true);

    for (const row of data ?? []) {
      const price = row.coin_price != null ? Number(row.coin_price) : null;
      if (price == null || price <= 0) continue;
      const episode = row.episodes as { story_id: string } | { story_id: string }[];
      const rel = Array.isArray(episode) ? episode[0] : episode;
      const storyId = rel?.story_id ? String(rel.story_id) : null;
      if (!storyId) continue;
      const current = prices.get(storyId);
      if (current == null || price < current) {
        prices.set(storyId, price);
      }
    }
  }
  return prices;
}

export function sortStoryIdsByNullablePrice(
  storyIds: string[],
  prices: Map<string, number | null>,
  direction: "asc" | "desc"
) {
  return [...storyIds].sort((a, b) => {
    const av = prices.get(a);
    const bv = prices.get(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return direction === "asc" ? av - bv : bv - av;
  });
}
