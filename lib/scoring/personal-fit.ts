import { clamp01 } from "@/lib/scoring/math";
import type { ScoringItem } from "@/types/scoring";

type InterestProfile = {
  preferred_genres: Record<string, number>;
  preferred_tags: Record<string, number>;
  preferred_authors: Record<string, number>;
  preferred_story_lengths: Record<string, number>;
  negative_genres: Record<string, number>;
  negative_tags: Record<string, number>;
  hidden_authors: Record<string, number>;
};

function scoreFromMap(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return 0;
  return map[key] ?? 0;
}

export function calculatePersonalFitScoreFromProfile(
  item: ScoringItem,
  profile: InterestProfile | null
): { score: number | null; debug: Record<string, unknown> } {
  if (!profile) {
    return { score: null, debug: { reason: "no_profile" } };
  }

  if (profile.hidden_authors[item.authorUserId]) {
    return { score: 0.05, debug: { reason: "hidden_author" } };
  }

  let score = 0.5;
  const genreKey = item.genreId ?? null;
  score += scoreFromMap(profile.preferred_genres, genreKey) * 0.15;
  score -= scoreFromMap(profile.negative_genres, genreKey) * 0.2;

  for (const tagId of item.tagIds ?? []) {
    score += scoreFromMap(profile.preferred_tags, tagId) * 0.05;
    score -= scoreFromMap(profile.negative_tags, tagId) * 0.08;
  }

  score += scoreFromMap(profile.preferred_authors, item.authorUserId) * 0.25;

  const lengthBucket =
    (item.episodeCount ?? 0) <= 20
      ? "short"
      : (item.episodeCount ?? 0) <= 80
        ? "medium"
        : "long";
  score += scoreFromMap(profile.preferred_story_lengths, lengthBucket) * 0.08;

  return {
    score: clamp01(score),
    debug: {
      genre_key: genreKey,
      length_bucket: lengthBucket,
      author_boost: scoreFromMap(profile.preferred_authors, item.authorUserId)
    }
  };
}
