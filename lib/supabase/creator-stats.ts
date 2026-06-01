import { createClient } from "@/lib/supabase/server";

export type CreatorEligibilityStats = {
  followers: number;
  total_reads: number;
  chapters_count: number;
  violations_count: number;
  account_age_days: number;
};

export async function getCreatorEligibilityStats(userId: string): Promise<{
  data: CreatorEligibilityStats;
  error: string | null;
}> {
  try {
    const supabase = await createClient();
    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (!creator?.id) {
      return {
        data: {
          followers: 0,
          total_reads: 0,
          chapters_count: 0,
          violations_count: 0,
          account_age_days: 0
        },
        error: null
      };
    }

    const creatorId = creator.id as string;
    const createdAt = creator.created_at as string;

    const [
      followersResult,
      metricsResult,
      chaptersResult,
      standaloneStoriesResult,
      reportsStory,
      reportsEpisode
    ] = await Promise.all([
        supabase
          .from("follows")
          .select("id", { count: "exact", head: true })
          .eq("following_id", creatorId)
          .eq("following_type", "creator"),
        supabase.rpc("get_public_creator_profile_metrics", {
          input_creator_id: creatorId
        }),
        supabase
          .from("episodes")
          .select("id, stories!inner(creator_id)", { count: "exact", head: true })
          .eq("stories.creator_id", creatorId)
          .in("status", ["approved", "published"]),
        supabase
          .from("stories")
          .select("id", { count: "exact", head: true })
          .eq("creator_id", creatorId)
          .eq("structure_type", "standalone")
          .in("status", ["approved", "published"])
          .gt("standalone_word_count", 0),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("target_type", "story")
          .in(
            "target_id",
            (
              await supabase
                .from("stories")
                .select("id")
                .eq("creator_id", creatorId)
            ).data?.map((s) => s.id) ?? []
          ),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("target_type", "episode")
          .in(
            "target_id",
            (
              await supabase
                .from("episodes")
                .select("id, stories!inner(creator_id)")
                .eq("stories.creator_id", creatorId)
            ).data?.map((e) => e.id) ?? []
          )
      ]);

    const metrics = Array.isArray(metricsResult.data)
      ? metricsResult.data[0]
      : metricsResult.data;

    const accountAgeDays = Math.max(
      0,
      Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000))
    );

    return {
      data: {
        followers: Number(metrics?.follower_count ?? followersResult.count ?? 0),
        total_reads: Number(metrics?.total_read_count ?? 0),
        chapters_count:
          Number(chaptersResult.count ?? 0) +
          Number(standaloneStoriesResult.count ?? 0),
        violations_count: Number((reportsStory.count ?? 0) + (reportsEpisode.count ?? 0)),
        account_age_days: accountAgeDays
      },
      error: null
    };
  } catch (error) {
    return {
      data: {
        followers: 0,
        total_reads: 0,
        chapters_count: 0,
        violations_count: 0,
        account_age_days: 0
      },
      error: error instanceof Error ? error.message : "Could not load creator stats."
    };
  }
}
