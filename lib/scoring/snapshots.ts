import type { DatabaseClient } from "@/lib/db/types";
import { getAlgorithmConfig } from "@/lib/algorithm/settings";
import { buildScoringConfig } from "@/lib/scoring/config";
import { scoreContentItem } from "@/lib/scoring/score-item";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  ContentScoreSnapshotRow,
  GenerateSnapshotsResult,
  MetricsWindow,
  ScoringItem,
  ScoringItemType
} from "@/types/scoring";

const DEFAULT_BATCH_LIMIT = 150;

type StoryRow = {
  id: string;
  is_completed: boolean;
  published_at: string | null;
  creator_profiles: { user_id: string | null } | { user_id: string | null }[] | null;
};

type ReelRow = {
  id: string;
  story_id: string | null;
  published_at: string | null;
  owner_id: string;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  published_at: string | null;
  word_count: number;
  stories: StoryRow | StoryRow[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapStoryToItem(
  row: StoryRow,
  tagIds: string[],
  genreTermId: string | null
): ScoringItem {
  const creator = firstRelation(row.creator_profiles);
  return {
    itemType: "story",
    itemId: row.id,
    storyId: row.id,
    authorUserId: creator?.user_id ?? "",
    publishedAt: row.published_at,
    genreId: genreTermId,
    tagIds,
    isCompleted: row.is_completed
  };
}

async function fetchPublishedStories(db: DatabaseClient, limit: number) {
  const { data, error } = await db
    .from("stories")
    .select(
      "id, is_completed, published_at, creator_profiles(user_id)"
    )
    .in("status", ["published", "approved"])
    .eq("visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as StoryRow[];
}

async function fetchPublishedReels(db: DatabaseClient, limit: number) {
  const { data, error } = await db
    .from("reels_items")
    .select("id, story_id, published_at, owner_id")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as ReelRow[];
}

async function fetchRecentChapters(db: DatabaseClient, limit: number) {
  const { data, error } = await db
    .from("episodes")
    .select(
      "id, story_id, published_at, word_count, stories!inner(id, is_completed, published_at, status, visibility, creator_profiles(user_id))"
    )
    .in("status", ["published", "approved"])
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

async function insertSnapshot(
  db: DatabaseClient,
  item: ScoringItem,
  window: MetricsWindow,
  breakdown: Awaited<ReturnType<typeof scoreContentItem>>
) {
  const { error } = await db.from("content_score_snapshots").insert({
    item_type: item.itemType,
    item_id: item.itemId,
    story_id: item.storyId,
    author_user_id: item.authorUserId,
    quality_score: breakdown.qualityScore,
    personal_fit_score: breakdown.personalFitScore,
    freshness_score: breakdown.freshnessScore,
    discovery_score: breakdown.discoveryScore,
    fairness_score: breakdown.fairnessScore,
    safety_score: breakdown.safetyScore,
    spam_penalty: breakdown.spamPenalty,
    final_reels_score: breakdown.finalReelsScore,
    final_discover_score: breakdown.finalDiscoverScore,
    final_search_boost_score: breakdown.finalSearchBoostScore,
    final_ranking_score: breakdown.finalRankingScore,
    metrics_window: window,
    debug_json: breakdown.debug
  });

  if (error) throw error;
}

export async function generateContentScoreSnapshot(
  db: DatabaseClient,
  options?: {
    window?: MetricsWindow;
    storyLimit?: number;
    reelLimit?: number;
    chapterLimit?: number;
  }
): Promise<GenerateSnapshotsResult> {
  const window = options?.window ?? "7d";
  const storyLimit = options?.storyLimit ?? DEFAULT_BATCH_LIMIT;
  const reelLimit = options?.reelLimit ?? DEFAULT_BATCH_LIMIT;
  const chapterLimit = options?.chapterLimit ?? Math.round(DEFAULT_BATCH_LIMIT / 2);

  const errors: string[] = [];
  let storiesProcessed = 0;
  let reelsProcessed = 0;
  let chaptersProcessed = 0;

  try {
    const rawConfig = await getAlgorithmConfig();
    const config = buildScoringConfig(rawConfig);

    const stories = await fetchPublishedStories(db, storyLimit);
    const taxonomyKeys = await (
      await import("@/lib/taxonomy/scoring-bridge")
    ).loadStoryTaxonomyKeysForScoring(
      db,
      stories.map((s) => s.id)
    );

    for (const story of stories) {
      const creator = firstRelation(story.creator_profiles);
      if (!creator?.user_id) continue;

      try {
        const keys = taxonomyKeys.get(story.id);
        const item = mapStoryToItem(
          story,
          keys?.tagTermIds ?? [],
          keys?.genreTermId ?? null
        );
        const breakdown = await scoreContentItem(db, item, {
          window,
          config
        });
        await insertSnapshot(db, item, window, breakdown);
        storiesProcessed += 1;
      } catch (error) {
        errors.push(
          `story:${story.id} — ${error instanceof Error ? error.message : "unknown"}`
        );
      }
    }

    const reels = await fetchPublishedReels(db, reelLimit);
    for (const reel of reels) {
      try {
        const item: ScoringItem = {
          itemType: "reel",
          itemId: reel.id,
          storyId: reel.story_id,
          authorUserId: reel.owner_id,
          publishedAt: reel.published_at
        };
        const breakdown = await scoreContentItem(db, item, { window, config });
        await insertSnapshot(db, item, window, breakdown);
        reelsProcessed += 1;
      } catch (error) {
        errors.push(
          `reel:${reel.id} — ${error instanceof Error ? error.message : "unknown"}`
        );
      }
    }

    const episodes = await fetchRecentChapters(db, chapterLimit);
    const chapterStoryIds = [
      ...new Set(
        episodes
          .map((episode) => {
            const story = firstRelation(episode.stories);
            return story?.id ?? null;
          })
          .filter(Boolean) as string[]
      )
    ];
    const chapterTaxonomyKeys = await (
      await import("@/lib/taxonomy/scoring-bridge")
    ).loadStoryTaxonomyKeysForScoring(db, chapterStoryIds);

    for (const episode of episodes) {
      const story = firstRelation(episode.stories);
      if (!story) continue;
      const creator = firstRelation(story.creator_profiles);
      if (!creator?.user_id) continue;

      try {
        const keys = chapterTaxonomyKeys.get(story.id);
        const item: ScoringItem = {
          itemType: "chapter",
          itemId: episode.id,
          storyId: episode.story_id,
          authorUserId: creator.user_id,
          publishedAt: episode.published_at ?? story.published_at,
          genreId: keys?.genreTermId ?? null,
          tagIds: keys?.tagTermIds ?? [],
          isCompleted: story.is_completed,
          wordCount: episode.word_count
        };
        const breakdown = await scoreContentItem(db, item, { window, config });
        await insertSnapshot(db, item, window, breakdown);
        chaptersProcessed += 1;
      } catch (error) {
        errors.push(
          `chapter:${episode.id} — ${error instanceof Error ? error.message : "unknown"}`
        );
      }
    }
  } catch (error) {
    if (isMissingSchemaError(error)) {
      return {
        storiesProcessed: 0,
        reelsProcessed: 0,
        chaptersProcessed: 0,
        errors: ["Schema scoring chưa sẵn sàng — chạy migration 149."]
      };
    }
    errors.push(error instanceof Error ? error.message : "Batch scoring failed");
  }

  return { storiesProcessed, reelsProcessed, chaptersProcessed, errors };
}

export async function getLatestScoreForItem(
  db: DatabaseClient,
  itemType: ScoringItemType,
  itemId: string,
  window?: MetricsWindow
): Promise<ContentScoreSnapshotRow | null> {
  let query = db
    .from("content_score_snapshots")
    .select("*")
    .eq("item_type", itemType)
    .eq("item_id", itemId)
    .order("snapshot_at", { ascending: false })
    .limit(1);

  if (window) {
    query = query.eq("metrics_window", window);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return null;
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    debug_json: (data.debug_json as Record<string, unknown>) ?? {}
  } as ContentScoreSnapshotRow;
}

/** Batch-load latest score snapshots (one query per chunk, dedupe by item_id). */
export async function getLatestScoresForItems(
  db: DatabaseClient,
  itemType: ScoringItemType,
  itemIds: string[],
  window: MetricsWindow = "7d"
): Promise<Map<string, ContentScoreSnapshotRow>> {
  const result = new Map<string, ContentScoreSnapshotRow>();
  if (itemIds.length === 0) {
    return result;
  }

  const uniqueIds = [...new Set(itemIds.filter(Boolean))];
  const chunkSize = 100;

  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    const chunk = uniqueIds.slice(index, index + chunkSize);
    const { data, error } = await db
      .from("content_score_snapshots")
      .select("*")
      .eq("item_type", itemType)
      .eq("metrics_window", window)
      .in("item_id", chunk)
      .order("snapshot_at", { ascending: false });

    if (error) {
      if (isMissingSchemaError(error)) {
        return result;
      }
      throw error;
    }

    for (const row of data ?? []) {
      const itemId = String(row.item_id);
      if (!result.has(itemId)) {
        result.set(itemId, {
          ...row,
          debug_json: (row.debug_json as Record<string, unknown>) ?? {}
        } as ContentScoreSnapshotRow);
      }
    }
  }

  return result;
}
