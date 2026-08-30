import {

  decodeReelsFeedCursor,

  encodeReelsFeedCursor

} from "@/lib/feed/cursor";

import { normalizeReelsFeedCandidate, candidateKeyFromFeed } from "@/lib/feed/catalog";

import { enrichReelsPage } from "@/lib/feed/enrich-reels-page";

import { loadUserFeedExclusions } from "@/lib/feed/exclusions";

import { buildReelsBatchFast, REELS_PAGE_BATCH_SIZE } from "@/lib/feed/reels-batch";

import { getReelsQualityFallback } from "@/lib/feed/reels-fallback";

import {

  loadFeedRequestSelection,

  logAlgorithmFeedRequest

} from "@/lib/feed/request-log";

import { createReelsShuffleSeed } from "@/lib/feed/reels-session-shuffle";

import { getOptionalSessionUser } from "@/lib/auth/get-optional-session-user";

import { createClient } from "@/lib/data/server";

import type { ReelsItem } from "@/lib/reels/getReelsItems";

import type { FeedCandidate, ReelsFeedResult, CandidatePools } from "@/types/feed-mixer";

import { randomUUID } from "crypto";



const BATCH_SIZE = REELS_PAGE_BATCH_SIZE;



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

  return rows.map((row) =>

    normalizeReelsFeedCandidate({

      pool: row.pool as FeedCandidate["pool"],

      itemType: row.item_type as FeedCandidate["itemType"],

      itemId: row.item_id,

      kind: row.kind as FeedCandidate["kind"] | undefined,

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

    })

  );

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

  shuffleSeed?: number;

  error?: string | null;

}): ReelsFeedResult {

  const pageSize = input.pageCandidates.length || input.items.length;

  const nextOffset = input.offset + pageSize;

  const batchTotal = input.batchTotal ?? nextOffset;

  const hasMore =

    input.algorithmVersion === "fallback"

      ? input.items.length >= input.limit

      : nextOffset < batchTotal && input.items.length > 0;



  const seenKeys = [

    ...input.seenFromCursor,

    ...input.pageCandidates.map((c) => candidateKeyFromFeed(c))

  ];



  const nextCursor =

    input.items.length > 0 && hasMore

      ? encodeReelsFeedCursor({

          v: 1,

          requestId: input.requestId,

          offset: nextOffset,

          seenKeys: seenKeys.slice(-200),

          shuffleSeed: input.shuffleSeed

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



async function loadReelsBatch(

  db: Awaited<ReturnType<typeof createClient>>,

  input: {

    requestId: string;

    shuffleSeed: number;

    userId: string | null;

    excludeKeys: Set<string>;

    recentlySeenKeys: Set<string>;

  }

): Promise<{

  batch: FeedCandidate[];

  requestId: string;

  algorithmVersion: string;

  poolCounts: Record<string, number>;

  shuffleSeed: number;

}> {

  if (input.requestId) {

    const saved = await loadFeedRequestSelection(db, input.requestId);

    if (saved?.items.length) {

      return {

        batch: selectionToCandidates(saved.items),

        requestId: input.requestId,

        algorithmVersion: saved.algorithmVersion,

        poolCounts: saved.poolCounts,

        shuffleSeed: input.shuffleSeed

      };

    }

  }



  const requestId = input.requestId || randomUUID();

  const batch = await buildReelsBatchFast(db, {

    batchSize: BATCH_SIZE,

    shuffleSeed: input.shuffleSeed,

    excludeKeys: input.excludeKeys,

    recentlySeenKeys: input.recentlySeenKeys

  });



  void logAlgorithmFeedRequest(db, {

    requestId,

    userId: input.userId,

    surface: "reels",

    algorithmVersion: "reels-fast",

    poolConfig: {},

    pools: {},

    selectedItems: batch

  });



  const uniqueStories = new Set(batch.map((item) => item.storyId)).size;



  return {

    batch,

    requestId,

    algorithmVersion: "reels-fast",

    poolCounts: {

      reels_fast: batch.length,

      unique_stories: uniqueStories

    },

    shuffleSeed: input.shuffleSeed

  };

}



export async function getReelsFeed(options: {

  limit?: number;

  offset?: number;

  cursor?: string | null;

  userId?: string | null;

}): Promise<ReelsFeedResult> {

  const limit = Math.max(1, Math.min(options.limit ?? 12, 30));

  const decoded = decodeReelsFeedCursor(options.cursor);

  const offset = decoded?.offset ?? Math.max(0, options.offset ?? 0);

  const shuffleSeed =

    decoded?.shuffleSeed ?? createReelsShuffleSeed();



  let requestId = decoded?.requestId ?? randomUUID();

  let algorithmVersion = "reels-fast";

  let poolCounts: Record<string, number> = {};



  try {

    const db = await createClient();

    const user = await getOptionalSessionUser();

    const userId = options.userId ?? user?.id ?? null;



    const { excludeKeys, recentlySeenKeys } = await loadUserFeedExclusions(

      db,

      userId

    );



    const seenFromCursor = new Set(decoded?.seenKeys ?? []);

    for (const key of seenFromCursor) {

      recentlySeenKeys.add(key);

    }



    let batch: FeedCandidate[] = [];

    let activeShuffleSeed = shuffleSeed;



    try {

      let loaded = await loadReelsBatch(db, {

        requestId,

        shuffleSeed: activeShuffleSeed,

        userId,

        excludeKeys,

        recentlySeenKeys

      });



      if (offset >= loaded.batch.length) {

        activeShuffleSeed = createReelsShuffleSeed();

        loaded = await loadReelsBatch(db, {

          requestId: randomUUID(),

          shuffleSeed: activeShuffleSeed,

          userId,

          excludeKeys,

          recentlySeenKeys

        });

        requestId = loaded.requestId;

      } else {

        requestId = loaded.requestId;

      }



      algorithmVersion = loaded.algorithmVersion;

      poolCounts = loaded.poolCounts;

      batch = loaded.batch;

      activeShuffleSeed = loaded.shuffleSeed;

    } catch (mixerError) {

      const fallback = await getReelsQualityFallback(db, {

        limit,

        offset,

        userId,

        excludeKeys,

        requestId,

        shuffleSeed: activeShuffleSeed,

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

        poolCounts: fallback.poolCounts,

        shuffleSeed: activeShuffleSeed

      });

    }



    const page = await enrichReelsPage(db, batch, {

      offset,

      limit,

      requestId,

      algorithmVersion,

      userId

    });



    let items = page.items;

    let pageCandidates = page.consumedCandidates;



    if (items.length === 0) {

      const fallback = await getReelsQualityFallback(db, {

        limit,

        offset,

        userId,

        excludeKeys,

        requestId,

        shuffleSeed: activeShuffleSeed,

        cause: new Error("Enrichment returned no public reels")

      });

      items = fallback.items;

      pageCandidates = [];

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

      shuffleSeed: activeShuffleSeed,

      poolCounts

    });

  } catch (error) {

    try {

      const db = await createClient();

      const user = await getOptionalSessionUser();

      const userId = options.userId ?? user?.id ?? null;

      const fallback = await getReelsQualityFallback(db, {

        limit,

        offset,

        userId,

        requestId,

        shuffleSeed: decoded?.shuffleSeed ?? createReelsShuffleSeed(),

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

        shuffleSeed: decoded?.shuffleSeed

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


