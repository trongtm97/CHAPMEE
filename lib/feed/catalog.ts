import type { SupabaseClient } from "@supabase/supabase-js";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import type { FeedCandidate, FeedItemKind } from "@/types/feed-mixer";
import {
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import { loadStoryTaxonomyBatch } from "@/lib/fair-distribution/load-taxonomy-context";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type ScoreRow = {
  item_type: string;
  item_id: string;
  quality_score: number;
  discovery_score: number;
  freshness_score: number;
  final_reels_score: number;
  final_discover_score: number;
  final_ranking_score: number;
};

export async function loadLatestScoreMap(
  supabase: SupabaseClient,
  itemType: "story" | "chapter" | "reel"
) {
  const map = new Map<string, ScoreRow>();

  const { data } = await supabase
    .from("content_score_snapshots")
    .select(
      "item_type, item_id, quality_score, discovery_score, freshness_score, final_reels_score, final_discover_score, final_ranking_score, snapshot_at"
    )
    .eq("item_type", itemType)
    .order("snapshot_at", { ascending: false })
    .limit(500);

  for (const row of data ?? []) {
    if (!map.has(row.item_id)) {
      map.set(row.item_id, row as ScoreRow);
    }
  }
  return map;
}

function scoresFor(
  map: Map<string, ScoreRow>,
  itemId: string,
  fallback: Partial<ScoreRow> = {}
) {
  const row = map.get(itemId);
  return {
    qualityScore: Number(row?.quality_score ?? fallback.quality_score ?? 0.35),
    discoveryScore: Number(row?.discovery_score ?? fallback.discovery_score ?? 0.35),
    freshnessScore: Number(row?.freshness_score ?? fallback.freshness_score ?? 0.35),
    finalReels: Number(row?.final_reels_score ?? 0.35),
    finalDiscover: Number(row?.final_discover_score ?? 0.35),
    finalRanking: Number(row?.final_ranking_score ?? 0.35)
  };
}

export async function fetchReelCatalogCandidates(
  supabase: SupabaseClient,
  fetchLimit = 250
): Promise<FeedCandidate[]> {
  const [episodeRes, manualRes, episodeScores, reelScores] = await Promise.all([
    supabase
      .from("episodes")
      .select(
        "id, published_at, stories!inner(id, creator_id, status, visibility, creator_profiles(id, user_id))"
      )
      .in("status", [...publicContentStatuses])
      .in("stories.status", [...publicContentStatuses])
      .eq("stories.visibility", "public")
      .order("published_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("reels_items")
      .select(
        "id, published_at, stories!inner(id, creator_id, status, visibility, creator_profiles(id, user_id))"
      )
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(fetchLimit),
    loadLatestScoreMap(supabase, "chapter"),
    loadLatestScoreMap(supabase, "reel")
  ]);

  const candidates: FeedCandidate[] = [];
  const storyIdsForTaxonomy: string[] = [];

  for (const episode of episodeRes.data ?? []) {
    const story = firstRelation(
      (episode as { stories: unknown }).stories as
        | { id: string; creator_id: string; creator_profiles: unknown }
        | null
    );
    if (story?.id) storyIdsForTaxonomy.push(story.id);
  }
  for (const reel of manualRes.data ?? []) {
    const story = firstRelation(
      (reel as { stories: unknown }).stories as { id: string } | null
    );
    if (story?.id) storyIdsForTaxonomy.push(story.id);
  }

  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    storyIdsForTaxonomy
  );
  const taxonomyMeta = await loadStoryTaxonomyBatch(supabase, storyIdsForTaxonomy);

  for (const episode of episodeRes.data ?? []) {
    const story = firstRelation(
      (episode as { stories: unknown }).stories as
        | { id: string; creator_id: string; creator_profiles: unknown }
        | null
    );
    if (!story) continue;
    const genre = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
    const meta = taxonomyMeta.get(story.id);
    const creator = firstRelation(
      story.creator_profiles as { id: string; user_id: string } | null
    );
    const scores = scoresFor(episodeScores, episode.id as string);
    candidates.push({
      pool: "fresh",
      itemType: "chapter",
      itemId: episode.id as string,
      kind: "episode",
      storyId: story.id,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? story.creator_id ?? null,
      genreName: genre.genreName,
      genreSlug: genre.genreSlug,
      mainGenreTermId: meta?.mainGenreTermId ?? null,
      taxonomyTermIds: meta?.taxonomyTermIds ?? [],
      presentationModeSlug: meta?.presentationModeSlug ?? null,
      publishedAt: (episode as { published_at: string | null }).published_at,
      mixerScore: scores.finalReels,
      qualityScore: scores.qualityScore,
      discoveryScore: scores.discoveryScore,
      freshnessScore: scores.freshnessScore
    });
  }

  for (const reel of manualRes.data ?? []) {
    const story = firstRelation(
      (reel as { stories: unknown }).stories as
        | { id: string; creator_id: string; creator_profiles: unknown }
        | null
    );
    if (!story) continue;
    const genre = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
    const meta = taxonomyMeta.get(story.id);
    const creator = firstRelation(
      story.creator_profiles as { id: string; user_id: string } | null
    );
    const scores = scoresFor(reelScores, reel.id as string);
    candidates.push({
      pool: "fresh",
      itemType: "reel",
      itemId: reel.id as string,
      kind: "manual",
      storyId: story.id,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? story.creator_id ?? null,
      genreName: genre.genreName,
      genreSlug: genre.genreSlug,
      mainGenreTermId: meta?.mainGenreTermId ?? null,
      taxonomyTermIds: meta?.taxonomyTermIds ?? [],
      presentationModeSlug: meta?.presentationModeSlug ?? null,
      publishedAt: reel.published_at as string | null,
      mixerScore: scores.finalReels,
      qualityScore: scores.qualityScore,
      discoveryScore: scores.discoveryScore,
      freshnessScore: scores.freshnessScore
    });
  }

  return candidates;
}

export async function fetchStoryCatalogCandidates(
  supabase: SupabaseClient,
  fetchLimit = 200
): Promise<FeedCandidate[]> {
  const [storyRes, scoreMap] = await Promise.all([
    supabase
      .from("stories")
      .select(
        "id, published_at, is_completed, creator_profiles(id, user_id)"
      )
      .in("status", [...publicContentStatuses])
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(fetchLimit),
    loadLatestScoreMap(supabase, "story")
  ]);

  const stories = storyRes.data ?? [];
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    stories.map((story) => String(story.id))
  );
  const taxonomyMeta = await loadStoryTaxonomyBatch(
    supabase,
    stories.map((story) => String(story.id))
  );

  return stories.map((story) => {
    const genre = pickMainGenreFromLabels(taxonomyByStory.get(String(story.id)));
    const meta = taxonomyMeta.get(String(story.id));
    const creator = firstRelation(
      story.creator_profiles as unknown as
        | { id: string; user_id: string }
        | { id: string; user_id: string }[]
        | null
    );
    const scores = scoresFor(scoreMap, story.id as string);
    return {
      pool: "fresh",
      itemType: "story",
      itemId: story.id as string,
      storyId: story.id as string,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? null,
      genreName: genre.genreName,
      genreSlug: genre.genreSlug,
      mainGenreTermId: meta?.mainGenreTermId ?? null,
      taxonomyTermIds: meta?.taxonomyTermIds ?? [],
      presentationModeSlug: meta?.presentationModeSlug ?? null,
      publishedAt: story.published_at as string | null,
      isCompleted: Boolean(story.is_completed),
      mixerScore: scores.finalDiscover,
      qualityScore: scores.qualityScore,
      discoveryScore: scores.discoveryScore,
      freshnessScore: scores.freshnessScore
    };
  });
}

export function filterCandidates(
  candidates: FeedCandidate[],
  options: {
    excludeKeys?: Set<string>;
    recentlySeenKeys?: Set<string>;
    skipRecent?: boolean;
    genreSlug?: string | null;
  }
) {
  return candidates.filter((c) => {
    const key = candidateKeyFromFeed(c);
    if (options.excludeKeys?.has(key)) return false;
    if (options.skipRecent && options.recentlySeenKeys?.has(key)) return false;
    if (options.genreSlug && c.genreSlug !== options.genreSlug) return false;
    if (!c.authorUserId) return false;
    return true;
  });
}

export function candidateKeyFromFeed(c: FeedCandidate) {
  const kind = c.kind ?? c.itemType;
  return `${kind}:${c.itemId}`;
}

export function tagPool(
  items: FeedCandidate[],
  pool: FeedCandidate["pool"],
  scoreFn?: (c: FeedCandidate) => number
): FeedCandidate[] {
  return items.map((item) => ({
    ...item,
    pool,
    mixerScore: scoreFn ? scoreFn(item) : item.mixerScore
  }));
}

export function sortByScore(items: FeedCandidate[], pick: (c: FeedCandidate) => number) {
  return [...items].sort((a, b) => pick(b) - pick(a));
}
