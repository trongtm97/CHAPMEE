import {
  decodeReelsFeedCursor,
  encodeReelsFeedCursor,
  candidateKey
} from "@/lib/feed/cursor";
import { enrichReelsCandidates } from "@/lib/feed/enrich-reels";
import { loadUserFeedExclusions } from "@/lib/feed/exclusions";
import { getCandidatesForSurface } from "@/lib/feed/pools";
import { getReelsQualityFallback } from "@/lib/feed/reels-fallback";
import { loadFeedRequestSelection } from "@/lib/feed/request-log";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import { createClient } from "@/lib/supabase/server";
import type { FeedCandidate, ReelsFeedResult } from "@/types/feed-mixer";
import { randomUUID } from "crypto";

const BATCH_SIZE = 120;

function selectionToCandidates(
  rows: Array<{
    pool: string;
    item_type: string;
    item_id: string;
    kind?: string;
    story_id: string;
    author_user_id: string;
    mixer_score?: number;
  }>
): FeedCandidate[] {
  return rows.map((row) => ({
    pool: row.pool as FeedCandidate["pool"],
    itemType: row.item_type as FeedCandidate["itemType"],
    itemId: row.item_id,
    kind: (row.kind === "manual" ? "manual" : row.kind === "episode" ? "episode" : undefined) as
      | FeedCandidate["kind"]
      | undefined,
    storyId: row.story_id,
    authorUserId: row.author_user_id,
    creatorId: null,
    genreName: null,
    genreSlug: null,
    publishedAt: null,
    mixerScore: row.mixer_score ?? 0.35,
    qualityScore: 0.35,
    discoveryScore: 0.35,
    freshnessScore: 0.35
  }));
}

function buildPageResult(input: {
  items: ReelsItem[];
  pageCandidates: FeedCandidate[];
  batchTotal?: number;
  offset: number;
  limit: number;
  seenFromCursor: Set<string>;
  requestId: string;
  algorithmVersion: string;
  poolCounts: Record<string, number>;
  error?: string | null;
}): ReelsFeedResult {
  const pageSize = input.pageCandidates.length || input.items.length;
  const nextOffset = input.offset + pageSize;
  const batchTotal = input.batchTotal ?? nextOffset;
  const hasMore =
    input.algorithmVersion === "fallback"
      ? input.items.length >= input.limit
      : nextOffset < batchTotal || pageSize >= input.limit;

  const seenKeys = [
    ...input.seenFromCursor,
    ...input.pageCandidates.map((c) =>
      candidateKey({
        kind: c.kind ?? c.itemType,
        itemType: c.itemType,
        itemId: c.itemId
      })
    )
  ];

  const nextCursor =
    input.items.length > 0 && hasMore
      ? encodeReelsFeedCursor({
          v: 1,
          requestId: input.requestId,
          offset: nextOffset,
          seenKeys: seenKeys.slice(-200)
        })
      : null;

  return {
    items: input.items,
    error: input.error ?? null,
    hasMore,
    nextOffset,
    nextCursor,
    requestId: input.requestId,
    algorithmVersion: input.algorithmVersion,
    poolCounts: input.poolCounts
  };
}

export async function getReelsFeed(options: {
  limit?: number;
  offset?: number;
  cursor?: string | null;
  userId?: string | null;
}): Promise<ReelsFeedResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 12, 20));
  const decoded = decodeReelsFeedCursor(options.cursor);
  const offset = decoded?.offset ?? Math.max(0, options.offset ?? 0);

  let requestId = decoded?.requestId ?? randomUUID();
  let algorithmVersion = "1.0.0";
  let poolCounts: Record<string, number> = {};

  try {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    const userId = options.userId ?? user?.id ?? null;

    const { excludeKeys, recentlySeenKeys } = await loadUserFeedExclusions(
      supabase,
      userId
    );

    const seenFromCursor = new Set(decoded?.seenKeys ?? []);
    for (const key of seenFromCursor) {
      recentlySeenKeys.add(key);
    }

    let batch: FeedCandidate[] = [];
    let usedFallback = false;

    try {
      if (decoded?.requestId) {
        const saved = await loadFeedRequestSelection(supabase, decoded.requestId);
        if (saved?.items.length) {
          batch = selectionToCandidates(saved.items);
          algorithmVersion = saved.algorithmVersion;
          poolCounts = saved.poolCounts;
          requestId = decoded.requestId;
        }
      }

      if (batch.length === 0) {
        const mixed = await getCandidatesForSurface(supabase, "reels", userId, {
          limit: BATCH_SIZE,
          requestId,
          excludeKeys,
          recentlySeenKeys
        });
        requestId = mixed.requestId;
        algorithmVersion = mixed.algorithmVersion;
        poolCounts = mixed.poolCounts;
        batch = mixed.candidates;
      }
    } catch (mixerError) {
      const fallback = await getReelsQualityFallback(supabase, {
        limit,
        offset,
        userId,
        excludeKeys,
        requestId,
        cause: mixerError
      });

      return buildPageResult({
        items: fallback.items,
        pageCandidates: [],
        offset,
        limit,
        seenFromCursor,
        requestId: fallback.requestId,
        algorithmVersion: fallback.algorithmVersion,
        poolCounts: fallback.poolCounts
      });
    }

    const pageCandidates = batch.slice(offset, offset + limit);
    let items = await enrichReelsCandidates(
      supabase,
      pageCandidates,
      { requestId, algorithmVersion, rankPositionStart: offset },
      userId
    );

    if (items.length === 0 && pageCandidates.length === 0) {
      const fallback = await getReelsQualityFallback(supabase, {
        limit,
        offset,
        userId,
        excludeKeys,
        requestId,
        cause: new Error("Empty algorithm batch")
      });
      usedFallback = true;
      items = fallback.items;
      requestId = fallback.requestId;
      algorithmVersion = fallback.algorithmVersion;
      poolCounts = fallback.poolCounts;
    }

    if (items.length === 0 && !usedFallback) {
      const fallback = await getReelsQualityFallback(supabase, {
        limit,
        offset,
        userId,
        excludeKeys,
        requestId,
        cause: new Error("Enrichment returned no public reels")
      });
      items = fallback.items;
      requestId = fallback.requestId;
      algorithmVersion = fallback.algorithmVersion;
      poolCounts = fallback.poolCounts;
    }

    return buildPageResult({
      items,
      pageCandidates,
      batchTotal: batch.length,
      offset,
      limit,
      seenFromCursor,
      requestId,
      algorithmVersion,
      poolCounts
    });
  } catch (error) {
    try {
      const supabase = await createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      const userId = options.userId ?? user?.id ?? null;
      const fallback = await getReelsQualityFallback(supabase, {
        limit,
        offset,
        userId,
        requestId,
        cause: error
      });

      return buildPageResult({
        items: fallback.items,
        pageCandidates: [],
        offset,
        limit,
        seenFromCursor: new Set(decoded?.seenKeys ?? []),
        requestId: fallback.requestId,
        algorithmVersion: fallback.algorithmVersion,
        poolCounts: fallback.poolCounts,
        error: null
      });
    } catch (fallbackError) {
      return {
        items: [] as ReelsItem[],
        error:
          fallbackError instanceof Error
            ? fallbackError.message
            : error instanceof Error
              ? error.message
              : "Could not load Reels feed.",
        hasMore: false,
        nextOffset: offset,
        nextCursor: null,
        requestId,
        algorithmVersion: "fallback",
        poolCounts: {}
      };
    }
  }
}
