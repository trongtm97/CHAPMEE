import type { SupabaseClient } from "@supabase/supabase-js";
import type { CandidatePools, FeedCandidate, PoolWeights } from "@/types/feed-mixer";

export function countCandidatesByPool(pools: CandidatePools) {
  const counts: Record<string, number> = {};
  for (const [pool, items] of Object.entries(pools)) {
    counts[pool] = items?.length ?? 0;
  }
  return counts;
}

export function serializeSelectedItems(items: FeedCandidate[], limit = 120) {
  return items.slice(0, limit).map((item) => ({
    pool: item.pool,
    item_type: item.itemType,
    item_id: item.itemId,
    kind: item.kind ?? item.itemType,
    story_id: item.storyId,
    author_user_id: item.authorUserId,
    mixer_score: item.mixerScore
  }));
}

export async function logAlgorithmFeedRequest(
  supabase: SupabaseClient,
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
  try {
    await supabase.from("algorithm_feed_requests").insert({
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
  supabase: SupabaseClient,
  requestId: string
) {
  const { data } = await supabase
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
    }>
  };
}
