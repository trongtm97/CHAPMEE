import type { SupabaseClient } from "@supabase/supabase-js";
import type { FeedCandidate } from "@/types/feed-mixer";

type InterestProfile = {
  preferred_genres: Record<string, number>;
  preferred_tags: Record<string, number>;
  preferred_authors: Record<string, number>;
  negative_genres: Record<string, number>;
  negative_tags: Record<string, number>;
  hidden_authors: Record<string, number>;
};

function mapScore(map: Record<string, number>, key: string | null | undefined) {
  if (!key) return 0;
  return map[key] ?? 0;
}

export async function loadUserInterestProfile(
  supabase: SupabaseClient,
  userId: string | null | undefined
) {
  if (!userId) return null;
  const { data } = await supabase
    .from("user_interest_profiles")
    .select(
      "preferred_genres, preferred_tags, preferred_authors, negative_genres, negative_tags, hidden_authors"
    )
    .eq("user_id", userId)
    .maybeSingle();
  return (data as InterestProfile | null) ?? null;
}

export function personalFitForCandidate(
  candidate: FeedCandidate,
  profile: InterestProfile | null
) {
  if (!profile) return 0.45;
  if (profile.hidden_authors[candidate.authorUserId]) return 0.05;

  let score = 0.45;
  const genreKey = candidate.genreSlug ?? candidate.genreName ?? "";
  score += mapScore(profile.preferred_genres, genreKey) * 0.18;
  score -= mapScore(profile.negative_genres, genreKey) * 0.22;
  score += mapScore(profile.preferred_authors, candidate.authorUserId) * 0.28;
  return Math.min(1, Math.max(0, score));
}

export async function loadFollowedCreatorIds(
  supabase: SupabaseClient,
  userId: string | null | undefined
) {
  const set = new Set<string>();
  if (!userId) return set;

  const { data } = await supabase
    .from("follows")
    .select("creator_id")
    .eq("follower_id", userId)
    .limit(200);

  for (const row of data ?? []) {
    if (row.creator_id) set.add(row.creator_id as string);
  }
  return set;
}
