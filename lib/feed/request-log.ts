import { createAdminClient } from "@/lib/data/admin";
import type { DatabaseClient } from "@/lib/db/types";
import type { CandidatePools, FeedCandidate, PoolWeights } from "@/types/feed-mixer";
import { REELS_PAGE_BATCH_SIZE } from "@/lib/feed/reels-batch";

/** Reels cursor pagination stores up to this many mixed candidates per request. */
export const REELS_FEED_BATCH_LIMIT = REELS_PAGE_BATCH_SIZE;

export function countCandidatesByPool(pools: CandidatePools) {
  const counts: Record<string, number> = {};
  for (const [pool, items] of Object.entries(pools)) {
    counts[pool] = items?.length ?? 0;
  }
  return counts;
}

export function serializeSelectedItems(
  items: FeedCandidate[],
  limit = REELS_FEED_BATCH_LIMIT
) {
  return items.slice(0, limit).map((item) => ({
    pool: item.pool,
    item_type: item.itemType,
    item_id: item.itemId,
    kind: item.kind ?? item.itemType,
    story_id: item.storyId,
    author_user_id: item.authorUserId,
    mixer_score: item.mixerScore,
    content_origin: item.contentOrigin ?? "original",
    rights_status: item.rightsStatus ?? null,
    selection_reason: item.selectionReason ?? null
  }));
}

export async function logAlgorithmFeedRequest(
  db: DatabaseClient,
  input: {
    requestId: string;
    userId: string | null;
    surface: string;
    algorithmVersion: string;
    poolConfig: PoolWeights;
    pools: CandidatePools;
    selectedItems: FeedCandidate[];
  }
) {
  let logClient: DatabaseClient = db;
  try {
    logClient = createAdminClient();
  } catch {
    // Fall back to caller client when admin headers are unavailable.
  }

  try {
    await logClient.from("algorithm_feed_requests").insert({
      request_id: input.requestId,
      user_id: input.userId,
      surface: input.surface,
      algorithm_version: input.algorithmVersion,
      pool_config: input.poolConfig,
      pool_counts: countCandidatesByPool(input.pools),
      selected_items: serializeSelectedItems(input.selectedItems)
    });
  } catch {
    // Debug logging must not break feed delivery.
  }
}

export async function loadFeedRequestSelection(
  _db: DatabaseClient,
  requestId: string
) {
  let readClient: DatabaseClient;
  try {
    readClient = createAdminClient();
  } catch {
    readClient = _db;
  }

  const { data } = await readClient
    .from("algorithm_feed_requests")
    .select("selected_items, algorithm_version, pool_counts")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.selected_items || !Array.isArray(data.selected_items)) {
    return null;
  }

  return {
    algorithmVersion:
      typeof data.algorithm_version === "string" ? data.algorithm_version : "1.0.0",
    poolCounts:
      data.pool_counts && typeof data.pool_counts === "object"
        ? (data.pool_counts as Record<string, number>)
        : {},
    items: data.selected_items as Array<{
      pool: string;
      item_type: string;
      item_id: string;
      kind?: string;
      story_id: string;
      author_user_id: string;
      mixer_score?: number;
      content_origin?: string;
      rights_status?: string | null;
      selection_reason?: string | null;
    }>
  };
}
