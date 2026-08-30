import type { DatabaseClient } from "@/lib/db/types";
import { getFairDistributionConfig } from "@/lib/fair-distribution/settings";
import { loadTaxonomyExposureShare } from "@/lib/fair-distribution/load-taxonomy-context";
import {
  computeQualityPenalty,
  loadQualityContextForCandidates
} from "@/lib/fair-distribution/quality-penalties";
import { scoreStoryCandidate } from "@/lib/fair-distribution/score-story-candidate";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { FairDistributionSurface } from "@/types/fair-distribution";
import type { FeedCandidate } from "@/types/feed-mixer";

const SURFACES: FairDistributionSurface[] = ["reels", "discover", "search", "catalog"];

export type GenerateFdsSnapshotsResult = {
  ok: boolean;
  storiesProcessed: number;
  snapshotsWritten: number;
  error?: string;
};

export async function generateFdsRecommendationSnapshots(
  db: DatabaseClient,
  options: { storyLimit?: number } = {}
): Promise<GenerateFdsSnapshotsResult> {
  const limit = options.storyLimit ?? 120;

  const { data: stories, error: storiesError } = await db
    .from("stories")
    .select("id, published_at, creator_profiles(user_id)")
    .in("status", ["published", "approved"])
    .eq("visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (storiesError) {
    if (isMissingSchemaError(storiesError)) {
      return { ok: false, storiesProcessed: 0, snapshotsWritten: 0, error: storiesError.message };
    }
    throw storiesError;
  }

  if (!stories?.length) {
    return { ok: true, storiesProcessed: 0, snapshotsWritten: 0 };
  }

  const storyIds = stories.map((s) => String(s.id));
  const { loadStoryTaxonomyBatch } = await import(
    "@/lib/fair-distribution/load-taxonomy-context"
  );
  const taxonomyMeta = await loadStoryTaxonomyBatch(db, storyIds);

  const { data: scoreRows } = await db
    .from("content_score_snapshots")
    .select("item_id, quality_score, discovery_score, freshness_score")
    .eq("item_type", "story")
    .in("item_id", storyIds)
    .order("snapshot_at", { ascending: false });

  const latestScore = new Map<string, { q: number; d: number; f: number }>();
  for (const row of scoreRows ?? []) {
    const id = String(row.item_id);
    if (latestScore.has(id)) continue;
    latestScore.set(id, {
      q: Number(row.quality_score ?? 0.35),
      d: Number(row.discovery_score ?? 0.35),
      f: Number(row.freshness_score ?? 0.35)
    });
  }

  const config = await getFairDistributionConfig();
  const candidates: FeedCandidate[] = stories.map((story) => {
    const id = String(story.id);
    const creator = Array.isArray(story.creator_profiles)
      ? story.creator_profiles[0]
      : story.creator_profiles;
    const meta = taxonomyMeta.get(id);
    const scores = latestScore.get(id) ?? { q: 0.35, d: 0.35, f: 0.35 };
    return {
      pool: "trending_quality",
      itemType: "story",
      itemId: id,
      storyId: id,
      authorUserId: (creator as { user_id?: string } | null)?.user_id ?? "",
      creatorId: null,
      genreName: null,
      genreSlug: null,
      mainGenreTermId: meta?.mainGenreTermId ?? null,
      taxonomyTermIds: meta?.taxonomyTermIds ?? [],
      presentationModeSlug: meta?.presentationModeSlug ?? null,
      publishedAt: story.published_at as string | null,
      mixerScore: scores.q,
      qualityScore: scores.q,
      discoveryScore: scores.d,
      freshnessScore: scores.f
    };
  });

  const { flags, qualityStatuses } = await loadQualityContextForCandidates(db,
    candidates
  );

  const rows: Array<{
    story_id: string;
    surface: string;
    score: number;
    score_details: Record<string, unknown>;
  }> = [];

  for (const surface of SURFACES) {
    const taxonomyShare = await loadTaxonomyExposureShare(db, surface, 7);

    for (const candidate of candidates) {
      const penalty = computeQualityPenalty(
        candidate.storyId,
        config,
        flags,
        qualityStatuses.get(candidate.storyId)
      );
      if (penalty.exclude) continue;

      const breakdown = scoreStoryCandidate(candidate, {
        config,
        taxonomySharePercent: taxonomyShare,
        penaltyScore: penalty.penalty,
        penaltyReasons: penalty.reasons
      });

      rows.push({
        story_id: candidate.storyId,
        surface,
        score: breakdown.finalScore,
        score_details: breakdown
      });
    }
  }

  if (rows.length === 0) {
    return { ok: true, storiesProcessed: stories.length, snapshotsWritten: 0 };
  }

  const { error: insertError } = await db
    .from("recommendation_score_snapshots")
    .insert(rows);

  if (insertError) {
    if (isMissingSchemaError(insertError)) {
      return {
        ok: false,
        storiesProcessed: stories.length,
        snapshotsWritten: 0,
        error: insertError.message
      };
    }
    throw insertError;
  }

  return {
    ok: true,
    storiesProcessed: stories.length,
    snapshotsWritten: rows.length
  };
}
