import type { SupabaseClient } from "@supabase/supabase-js";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { isMissingSchemaError } from "@/lib/supabase/schema-errors";
import {
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";
import type { FeedCandidate, FeedSurface } from "@/types/feed-mixer";
import type { ColdStartTestRow } from "@/types/cold-start";

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function candidateKey(c: FeedCandidate) {
  return `${c.itemType}:${c.itemId}`;
}

export async function loadActiveColdStartTests(
  supabase: SupabaseClient,
  surface: FeedSurface
) {
  const itemTypes =
    surface === "reels" ? (["reel", "author"] as const) : (["story", "author"] as const);

  const { data, error } = await supabase
    .from("cold_start_tests")
    .select("*")
    .eq("status", "active")
    .in("item_type", [...itemTypes])
    .limit(120);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return ((data ?? []) as ColdStartTestRow[]).filter(
    (test) => test.delivered_impressions < test.target_impressions
  );
}

export async function loadQualifiedColdStartTests(
  supabase: SupabaseClient,
  surface: FeedSurface
) {
  const itemTypes =
    surface === "reels" ? (["reel", "author"] as const) : (["story", "author"] as const);

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("cold_start_tests")
    .select("*")
    .eq("status", "qualified")
    .in("item_type", [...itemTypes])
    .gte("qualified_at", weekAgo)
    .limit(80);

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return data as ColdStartTestRow[];
}

async function storyCandidatesFromTests(
  supabase: SupabaseClient,
  tests: ColdStartTestRow[]
): Promise<FeedCandidate[]> {
  const storyIds = new Set<string>();
  const authorIds = new Set<string>();

  for (const test of tests) {
    if (test.item_type === "story") storyIds.add(test.item_id);
    if (test.item_type === "author") authorIds.add(test.author_user_id);
  }

  if (authorIds.size > 0) {
    const { data: creators } = await supabase
      .from("creator_profiles")
      .select("id, user_id")
      .in("user_id", [...authorIds]);

    const creatorIds = (creators ?? []).map((c) => c.id as string);
    if (creatorIds.length > 0) {
      const { data: stories } = await supabase
        .from("stories")
        .select("id")
        .in("creator_id", creatorIds)
        .in("status", [...publicContentStatuses])
        .eq("visibility", "public")
        .order("published_at", { ascending: false })
        .limit(40);

      for (const story of stories ?? []) {
        storyIds.add(story.id as string);
      }
    }
  }

  if (storyIds.size === 0) return [];

  const { data } = await supabase
    .from("stories")
    .select(
      "id, published_at, is_completed, creator_profiles(id, user_id)"
    )
    .in("id", [...storyIds])
    .in("status", [...publicContentStatuses])
    .eq("visibility", "public");

  const stories = data ?? [];
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    stories.map((story) => String(story.id))
  );

  return stories.map((story) => {
    const picked = pickMainGenreFromLabels(taxonomyByStory.get(String(story.id)));
    const creator = firstRelation(
      story.creator_profiles as
        | { id: string; user_id: string }
        | { id: string; user_id: string }[]
        | null
    );
    return {
      pool: "cold_start" as const,
      itemType: "story" as const,
      itemId: story.id as string,
      storyId: story.id as string,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? null,
      genreName: picked.genreName,
      genreSlug: picked.genreSlug,
      publishedAt: story.published_at as string | null,
      isCompleted: Boolean(story.is_completed),
      mixerScore: 0.72,
      qualityScore: 0.45,
      discoveryScore: 0.55,
      freshnessScore: 0.85
    };
  });
}

async function reelCandidatesFromTests(
  supabase: SupabaseClient,
  tests: ColdStartTestRow[]
): Promise<FeedCandidate[]> {
  const reelIds = new Set<string>();
  const authorIds = new Set<string>();

  for (const test of tests) {
    if (test.item_type === "reel") reelIds.add(test.item_id);
    if (test.item_type === "author") authorIds.add(test.author_user_id);
  }

  if (authorIds.size > 0) {
    const { data: reels } = await supabase
      .from("reels_items")
      .select("id")
      .in("owner_id", [...authorIds])
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(30);

    for (const reel of reels ?? []) reelIds.add(reel.id as string);
  }

  if (reelIds.size === 0) return [];

  const { data } = await supabase
    .from("reels_items")
    .select(
      "id, published_at, stories!inner(id, creator_id, creator_profiles(id, user_id))"
    )
    .in("id", [...reelIds])
    .eq("status", "published");

  const storyIdsForTaxonomy: string[] = [];
  for (const reel of data ?? []) {
    const story = firstRelation(
      reel.stories as unknown as { id: string } | { id: string }[] | null
    );
    if (story?.id) storyIdsForTaxonomy.push(story.id);
  }
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    storyIdsForTaxonomy
  );

  const candidates: FeedCandidate[] = [];

  for (const reel of data ?? []) {
    const story = firstRelation(
      reel.stories as unknown as
        | {
            id: string;
            creator_id: string;
            creator_profiles: unknown;
          }
        | {
            id: string;
            creator_id: string;
            creator_profiles: unknown;
          }[]
        | null
    );
    if (!story) continue;
    const picked = pickMainGenreFromLabels(taxonomyByStory.get(story.id));
    const creator = firstRelation(
      story.creator_profiles as
        | { id: string; user_id: string }
        | { id: string; user_id: string }[]
        | null
    );
    candidates.push({
      pool: "cold_start",
      itemType: "reel",
      itemId: reel.id as string,
      kind: "manual",
      storyId: story.id,
      authorUserId: creator?.user_id ?? "",
      creatorId: creator?.id ?? story.creator_id ?? null,
      genreName: picked.genreName,
      genreSlug: picked.genreSlug,
      publishedAt: reel.published_at as string | null,
      mixerScore: 0.7,
      qualityScore: 0.42,
      discoveryScore: 0.58,
      freshnessScore: 0.88
    });
  }

  return candidates;
}

export async function getColdStartCandidates(
  supabase: SupabaseClient,
  surface: FeedSurface,
  limit = 40
): Promise<FeedCandidate[]> {
  const active = await loadActiveColdStartTests(supabase, surface);
  const raw =
    surface === "reels"
      ? await reelCandidatesFromTests(supabase, active)
      : await storyCandidatesFromTests(supabase, active);

  const seen = new Set<string>();
  const unique: FeedCandidate[] = [];

  for (const candidate of raw) {
    const key = candidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
    if (unique.length >= limit) break;
  }

  return unique;
}

export async function getQualifiedGrowthCandidates(
  supabase: SupabaseClient,
  surface: FeedSurface,
  limit = 30
): Promise<FeedCandidate[]> {
  const qualified = await loadQualifiedColdStartTests(supabase, surface);
  const raw =
    surface === "reels"
      ? await reelCandidatesFromTests(supabase, qualified)
      : await storyCandidatesFromTests(supabase, qualified);

  return raw.slice(0, limit).map((c) => ({
    ...c,
    pool: "growing",
    mixerScore: Math.min(0.95, c.mixerScore + 0.15),
    discoveryScore: Math.min(0.95, c.discoveryScore + 0.2)
  }));
}
