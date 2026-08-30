import { createClient } from "@/lib/data/server";

type StoryJoin = {
  updated_at: string;
  visibility: string;
  status: string;
};

function pickStory(stories: StoryJoin | StoryJoin[] | null): StoryJoin | null {
  if (!stories) return null;
  return Array.isArray(stories) ? (stories[0] ?? null) : stories;
}

function isPublishedPublicStory(story: StoryJoin | null): story is StoryJoin {
  if (!story) return false;
  return (
    story.visibility === "public" &&
    (story.status === "published" || story.status === "approved")
  );
}

async function fetchPublishedCountsViaRpc(
  termIds: string[]
): Promise<Map<string, number> | null> {
  if (termIds.length === 0) return new Map();

  const db = await createClient();
  const { data, error } = await db.rpc("get_taxonomy_published_story_counts", {
    term_ids: termIds
  });

  if (error) return null;

  const counts = new Map<string, number>();
  for (const row of Array.isArray(data) ? data : []) {
    counts.set(String(row.term_id), Number(row.story_count ?? 0));
  }
  return counts;
}

async function fetchLatestUpdatedViaRpc(
  termIds: string[]
): Promise<Map<string, string> | null> {
  if (termIds.length === 0) return new Map();

  const db = await createClient();
  const { data, error } = await db.rpc("get_taxonomy_latest_story_updated", {
    term_ids: termIds
  });

  if (error) return null;

  const latest = new Map<string, string>();
  for (const row of Array.isArray(data) ? data : []) {
    if (row.latest_updated) {
      latest.set(String(row.term_id), String(row.latest_updated));
    }
  }
  return latest;
}

async function fetchPublishedCountsFallback(
  termIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (termIds.length === 0) return counts;

  const db = await createClient();
  const chunkSize = 200;

  for (let i = 0; i < termIds.length; i += chunkSize) {
    const chunk = termIds.slice(i, i + chunkSize);
    const { data, error } = await db
      .from("story_taxonomy_terms")
      .select("term_id, story_id, stories!inner(visibility, status)")
      .in("term_id", chunk);

    if (error) continue;

    const seen = new Map<string, Set<string>>();
    for (const row of data ?? []) {
      const story = pickStory(row.stories as StoryJoin | StoryJoin[] | null);
      if (!isPublishedPublicStory(story)) continue;
      const termId = String(row.term_id);
      const storyId = String(row.story_id);
      const bucket = seen.get(termId) ?? new Set<string>();
      bucket.add(storyId);
      seen.set(termId, bucket);
    }

    for (const [termId, storySet] of seen) {
      counts.set(termId, storySet.size);
    }
  }

  return counts;
}

async function fetchLatestUpdatedFallback(termIds: string[]): Promise<Map<string, string>> {
  const latest = new Map<string, string>();
  if (termIds.length === 0) return latest;

  const db = await createClient();
  const chunkSize = 200;

  for (let i = 0; i < termIds.length; i += chunkSize) {
    const chunk = termIds.slice(i, i + chunkSize);
    const { data, error } = await db
      .from("story_taxonomy_terms")
      .select("term_id, stories!inner(updated_at, visibility, status)")
      .in("term_id", chunk);

    if (error) continue;

    for (const row of data ?? []) {
      const story = pickStory(row.stories as StoryJoin | StoryJoin[] | null);
      if (!isPublishedPublicStory(story)) continue;
      const termId = String(row.term_id);
      const ts = String(story.updated_at);
      const prev = latest.get(termId);
      if (!prev || ts > prev) latest.set(termId, ts);
    }
  }

  return latest;
}

/**
 * Distinct published public story count per taxonomy term (for SEO index threshold).
 */
export async function getPublishedStoryCountsByTermIds(
  termIds: string[]
): Promise<Map<string, number>> {
  const viaRpc = await fetchPublishedCountsViaRpc(termIds);
  if (viaRpc) return viaRpc;
  return fetchPublishedCountsFallback(termIds);
}

/**
 * Latest `stories.updated_at` among published public stories linked to each term.
 */
export async function getLatestStoryUpdatedAtByTermIds(
  termIds: string[]
): Promise<Map<string, string>> {
  const viaRpc = await fetchLatestUpdatedViaRpc(termIds);
  if (viaRpc) return viaRpc;
  return fetchLatestUpdatedFallback(termIds);
}

export function maxIsoTimestamp(a: string | null | undefined, b: string | null | undefined) {
  if (!a?.trim()) return b ?? null;
  if (!b?.trim()) return a;
  return a > b ? a : b;
}
