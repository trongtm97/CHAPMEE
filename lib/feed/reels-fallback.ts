import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchReelCatalogCandidates,
  filterCandidates,
  sortByScore
} from "@/lib/feed/catalog";
import { enrichReelsCandidates } from "@/lib/feed/enrich-reels";
import { enforceFeedDiversity } from "@/lib/fairness/diversity";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

function logFallbackError(error: unknown) {
  if (process.env.NODE_ENV === "production") return;
  console.warn("[reels-feed] algorithm fallback engaged", error);
}

export async function getReelsQualityFallback(
  supabase: SupabaseClient,
  options: {
    limit: number;
    offset?: number;
    userId: string | null;
    excludeKeys?: Set<string>;
    requestId?: string;
    cause?: unknown;
  }
): Promise<{
  items: ReelsItem[];
  requestId: string;
  algorithmVersion: string;
  poolCounts: Record<string, number>;
}> {
  if (options.cause) {
    logFallbackError(options.cause);
  }

  const limit = Math.max(1, Math.min(options.limit, 20));
  const offset = Math.max(0, options.offset ?? 0);
  const requestId = options.requestId ?? randomUUID();

  const catalog = await fetchReelCatalogCandidates(supabase, 220);
  const filtered = filterCandidates(catalog, {
    excludeKeys: options.excludeKeys
  });

  const sorted = sortByScore(
    filtered,
    (candidate) => candidate.qualityScore * 0.55 + candidate.mixerScore * 0.45
  );

  const diversified = enforceFeedDiversity(sorted, {
    targetLength: offset + limit + 24,
    rerankRules: {
      maxConsecutiveSameAuthor: 1,
      maxSameStoryInWindow: 3,
      storyWindowSize: 30
    }
  });

  const pageCandidates = diversified.slice(offset, offset + limit).map((candidate) => ({
    ...candidate,
    pool: candidate.pool ?? ("fresh" as const)
  }));

  const items = await enrichReelsCandidates(
    supabase,
    pageCandidates,
    {
      requestId,
      algorithmVersion: "fallback",
      rankPositionStart: offset
    },
    options.userId
  );

  return {
    items,
    requestId,
    algorithmVersion: "fallback",
    poolCounts: { fresh: pageCandidates.length, fallback: pageCandidates.length }
  };
}
