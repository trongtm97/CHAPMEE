import { createAdminClient } from "@/lib/data/admin";
import { isMissingSchemaError } from "@/lib/data/schema-errors";
import type { RecommendationExposureLogInput } from "@/types/fair-distribution";
import type { ScoredFeedCandidate } from "@/types/fair-distribution";
import type { DatabaseClient } from "@/lib/db/types";

export async function logRecommendationExposure(
  db: DatabaseClient,
  items: Array<ScoredFeedCandidate | RecommendationExposureLogInput>,
  context: { surface: string; requestId?: string; userId?: string | null; simulation?: boolean }
) {
  if (context.simulation) return;

  const rows = items.map((item, index) => {
    if ("storyId" in item && "reasonJson" in item && !("mixerScore" in item)) {
      const input = item as RecommendationExposureLogInput;
      return {
        user_id: input.userId ?? context.userId ?? null,
        story_id: input.storyId,
        author_id: input.authorId ?? null,
        surface: input.surface,
        taxonomy_term_ids: input.taxonomyTermIds ?? [],
        position: input.position ?? index,
        score: input.score ?? null,
        reason_json: input.reasonJson ?? {},
        request_id: input.requestId ?? context.requestId ?? null,
        simulation: input.simulation ?? false
      };
    }

    const candidate = item as ScoredFeedCandidate;
    return {
      user_id: context.userId ?? null,
      story_id: candidate.storyId,
      author_id: candidate.authorUserId || null,
      surface: context.surface,
      taxonomy_term_ids: candidate.taxonomyTermIds ?? [],
      position: index,
      score: candidate.scoreBreakdown?.finalScore ?? candidate.mixerScore,
      reason_json: candidate.scoreBreakdown ?? {},
      request_id: context.requestId ?? null,
      simulation: false
    };
  });

  if (rows.length === 0) return;

  let client = db;
  try {
    client = createAdminClient();
  } catch {
    // use provided client
  }

  const { error } = await client.from("recommendation_exposure_logs").insert(rows);
  if (error && !isMissingSchemaError(error) && process.env.NODE_ENV !== "production") {
    console.warn("[fair-distribution] exposure log insert failed", error.message);
  }
}

export async function logRecommendationExposureBatch(
  db: DatabaseClient,
  candidates: ScoredFeedCandidate[],
  context: { surface: string; requestId?: string; userId?: string | null; rankPositionStart?: number }
) {
  await logRecommendationExposure(db,
    candidates.map((c, i) => ({
      userId: context.userId,
      storyId: c.storyId,
      authorId: c.authorUserId,
      surface: context.surface as RecommendationExposureLogInput["surface"],
      taxonomyTermIds: c.taxonomyTermIds,
      position: (context.rankPositionStart ?? 0) + i,
      score: c.scoreBreakdown?.finalScore ?? c.mixerScore,
      reasonJson: c.scoreBreakdown,
      requestId: context.requestId
    })),
    context
  );
}
