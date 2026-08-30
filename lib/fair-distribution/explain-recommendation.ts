import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import { loadStoryTaxonomyBatch, loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import {
  loadQualityContextForCandidates,
  computeQualityPenalty
} from "@/lib/fair-distribution/quality-penalties";
import { scoreStoryCandidate } from "@/lib/fair-distribution/score-story-candidate";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type {
  ExplainRecommendationResult,
  FairDistributionSurface
} from "@/types/fair-distribution";
import type { FeedCandidate } from "@/types/feed-mixer";
import type { DatabaseClient } from "@/lib/db/types";

function sinceIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function countExposure(
  db: DatabaseClient,
  storyId: string,
  since: string
) {
  const { count } = await db
    .from("exposure_events")
    .select("id", { count: "exact", head: true })
    .eq("story_id", storyId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function explainRecommendation(
  db: DatabaseClient,
  storyId: string,
  surface: FairDistributionSurface = "reels"
): Promise<ExplainRecommendationResult> {
  const config = await getFairDistributionConfig();

  const { data: story } = await db
    .from("stories")
    .select("id, title, published_at, creator_profiles(user_id)")
    .eq("id", storyId)
    .maybeSingle();

  const creator = Array.isArray(story?.creator_profiles)
    ? story?.creator_profiles[0]
    : story?.creator_profiles;
  const authorUserId = (creator as { user_id?: string } | null)?.user_id ?? "";

  const [taxonomyMeta, scoreRow] = await Promise.all([
    loadStoryTaxonomyBatch(db, [storyId]),
    db
      .from("content_score_snapshots")
      .select("quality_score, discovery_score, freshness_score")
      .eq("item_type", "story")
      .eq("item_id", storyId)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const meta = taxonomyMeta.get(storyId);
  const q = Number(scoreRow.data?.quality_score ?? 0.5);
  const d = Number(scoreRow.data?.discovery_score ?? 0.5);
  const f = Number(scoreRow.data?.freshness_score ?? 0.5);

  const candidate: FeedCandidate = {
    pool: "trending_quality",
    itemType: "story",
    itemId: storyId,
    storyId,
    authorUserId,
    creatorId: null,
    genreName: null,
    genreSlug: null,
    mainGenreTermId: meta?.mainGenreTermId ?? null,
    taxonomyTermIds: meta?.taxonomyTermIds ?? [],
    presentationModeSlug: meta?.presentationModeSlug ?? null,
    publishedAt: story?.published_at ?? null,
    mixerScore: q,
    qualityScore: q,
    discoveryScore: d,
    freshnessScore: f
  };

  const [{ flags, qualityStatuses }, taxonomyShare, exposure24h, exposure7d] =
    await Promise.all([
      loadQualityContextForCandidates(db, [candidate]),
      loadTaxonomyExposureShare(db, surface, 7),
      countExposure(db, storyId, sinceIso(1)),
      countExposure(db, storyId, sinceIso(7))
    ]);

  const penalty = computeQualityPenalty(
    storyId,
    config,
    flags,
    qualityStatuses.get(storyId)
  );

  const breakdown = scoreStoryCandidate(candidate, {
    config,
    taxonomySharePercent: taxonomyShare,
    penaltyScore: penalty.penalty,
    penaltyReasons: penalty.reasons
  });

  let recentLogs: ExplainRecommendationResult["recentLogs"] = [];
  const { data: logs, error: logsError } = await db
    .from("recommendation_exposure_logs")
    .select("shown_at, surface, score, reason_json")
    .eq("story_id", storyId)
    .order("shown_at", { ascending: false })
    .limit(10);

  if (!logsError) {
    recentLogs = (logs ?? []).map((row) => ({
      shownAt: row.shown_at as string,
      surface: row.surface as string,
      score: row.score != null ? Number(row.score) : null,
      reasons: Array.isArray((row.reason_json as { reasons?: string[] })?.reasons)
        ? ((row.reason_json as { reasons: string[] }).reasons ?? [])
        : []
    }));
  } else if (!isMissingSchemaError(logsError)) {
    recentLogs = [];
  }

  const termIds = candidate.taxonomyTermIds ?? [];
  const taxonomyExposure = termIds.map((termId) => ({
    termId,
    impressions7d: Math.round((taxonomyShare.get(termId) ?? 0) * exposure7d * 0.01)
  }));

  return {
    storyId,
    surface,
    breakdown,
    exposure24h,
    exposure7d,
    taxonomyExposure,
    recentLogs
  };
}
