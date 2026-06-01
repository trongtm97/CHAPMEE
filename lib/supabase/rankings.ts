import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { createClient } from "@/lib/supabase/server";
import { getRankedStoryIds } from "@/lib/ranking/getTrendingStories";
import { getTimePeriodStart } from "@/lib/rankings/ranking-formulas";
import { getStoryTaxonomyLabelsByStoryIds } from "@/lib/taxonomy/discover-bridge";
import type { StoryRankingWindow } from "@/lib/ranking/storyRanking";
import type {
  StoryRankingItem,
  AuthorRankingItem,
  FanRankingItem,
  RankingTimePeriod
} from "@/types/ranking";

type HotStoryRow = {
  id: string;
  title: string;
  slug: string;
  public_code: string;
  hook: string | null;
  short_description: string | null;
  is_completed: boolean | null;
  published_at: string | null;
  creator_profiles:
    | {
        id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }
    | {
        id: string | null;
        pen_name: string | null;
        profiles?: { display_name: string | null; username: string | null } | null;
      }[]
    | null;
};

type ScoreRow = {
  story_id: string;
  score: number;
};

type TopAuthorRow = {
  author_id: string;
  user_id: string;
  pen_name: string;
  username?: string | null;
  avatar_url: string | null;
  follower_count: number;
  total_reads: number;
  story_count: number;
  score: number;
};

type TopFanRow = {
  rank: number;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  total_score: number;
  is_current_user: boolean;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getHotStories(
  period: RankingTimePeriod,
  limit = 20
): Promise<StoryRankingItem[]> {
  try {
    const windowLabel: StoryRankingWindow =
      period === "today" ? "24h" : period === "all" ? "all" : "7d";
    const ranked = await getRankedStoryIds(windowLabel, limit);

    if (ranked.length === 0) {
      return getRecentStories(limit);
    }

    const storyIds = ranked.map((r) => r.storyId);

    const supabase = await createClient();
    const { data } = await supabase
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, short_description, is_completed, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .in("id", storyIds)
      .in("status", ["approved", "published"])
      .eq("visibility", "public");

    const rows = (data ?? []) as unknown as HotStoryRow[];
    const rowsMap = new Map(rows.map((r: HotStoryRow) => [r.id, r]));
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, storyIds);

    return ranked
      .map((r, index) => {
        const row = rowsMap.get(r.storyId);
        if (!row) return null;

        const creator = firstRelation(row.creator_profiles);

        return {
          id: row.id,
          rank: index + 1,
          title: row.title,
          slug: row.slug,
          publicCode: row.public_code,
          hook: row.hook,
          shortDescription: row.short_description,
          genreName: taxonomyByStory.get(row.id)?.mainGenreName ?? null,
          creatorName: creator
            ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
            : null,
          creatorId: creator?.id ?? null,
          score: r.score
        };
      })
      .filter((item): item is StoryRankingItem => item !== null);
  } catch {
    return [];
  }
}

async function getRecentStories(limit = 20): Promise<StoryRankingItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, short_description, is_completed, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .in("status", ["approved", "published"])
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(limit);

    const rows = (data ?? []) as unknown as HotStoryRow[];
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(
      supabase,
      rows.map((row) => row.id)
    );

    return rows.map((row: HotStoryRow, index: number) => {
      const creator = firstRelation(row.creator_profiles);

      return {
        id: row.id,
        rank: index + 1,
        title: row.title,
        slug: row.slug,
        publicCode: row.public_code,
        hook: row.hook,
        shortDescription: row.short_description,
        genreName: taxonomyByStory.get(row.id)?.mainGenreName ?? null,
        creatorName: creator
          ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
          : null,
        creatorId: creator?.id ?? null,
        score: 0
      };
    });
  } catch {
    return [];
  }
}

export async function getRisingStories(
  period: RankingTimePeriod,
  limit = 20
): Promise<StoryRankingItem[]> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  try {
    const supabase = await createClient();
    const window = period === "today" ? "24h" : period === "all" ? "all" : "7d";

    const { data: scoresData } = await supabase.rpc(
      "get_public_story_rankings",
      {
        ranking_limit: limit * 2,
        window_start:
          window === "all"
            ? thirtyDaysAgo
            : getTimePeriodStart(period)?.toISOString() ?? thirtyDaysAgo
      }
    );

    const scoreRows = ((scoresData ?? []) as ScoreRow[]).filter(
      (r) => r.score > 0
    );

    if (scoreRows.length === 0) {
      return [];
    }

    const storyIds = scoreRows.map((r) => r.story_id);

    const { data } = await supabase
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, short_description, is_completed, published_at, ${CREATOR_PROFILE_STORY_JOIN}`
      )
      .in("id", storyIds)
      .in("status", ["approved", "published"])
      .eq("visibility", "public")
      .gte("published_at", thirtyDaysAgo)
      .order("published_at", { ascending: false });

    const rows = (data ?? []) as unknown as HotStoryRow[];
    const rowsMap = new Map(rows.map((r: HotStoryRow) => [r.id, r]));
    const taxonomyByStory = await getStoryTaxonomyLabelsByStoryIds(supabase, storyIds);

    return scoreRows
      .map((sr, index) => {
        const row = rowsMap.get(sr.story_id);
        if (!row) return null;

        const creator = firstRelation(row.creator_profiles);

        return {
          id: row.id,
          rank: index + 1,
          title: row.title,
          slug: row.slug,
          publicCode: row.public_code,
          hook: row.hook,
          shortDescription: row.short_description,
          genreName: taxonomyByStory.get(row.id)?.mainGenreName ?? null,
          creatorName: creator
            ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
            : null,
          creatorId: creator?.id ?? null,
          score: sr.score
        };
      })
      .filter((item): item is StoryRankingItem => item !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function getTopAuthors(
  period: RankingTimePeriod,
  limit = 20
): Promise<AuthorRankingItem[]> {
  try {
    const supabase = await createClient();
    const windowStart = getTimePeriodStart(period)?.toISOString() ?? null;

    const { data, error } = await supabase.rpc("get_top_authors", {
      window_start: windowStart,
      ranking_limit: limit
    });

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as TopAuthorRow[];

    return rows.map((row: TopAuthorRow, index: number) => ({
      id: row.author_id,
      rank: index + 1,
      userId: row.user_id,
      displayName: row.pen_name ?? "Tác giả",
      username: row.username ?? null,
      avatarUrl: row.avatar_url,
      followerCount: Number(row.follower_count),
      totalReads: Number(row.total_reads),
      storyCount: Number(row.story_count),
      score: Number(row.score)
    }));
  } catch {
    return [];
  }
}

export async function getTopFans(
  limit = 20,
  currentUserId?: string | null
): Promise<FanRankingItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_app_top_fans", {
      ranking_limit: limit,
      input_user_id: currentUserId ?? null
    });

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as TopFanRow[];

    return rows.map((row: TopFanRow) => ({
      id: row.user_id,
      rank: Number(row.rank),
      displayName: row.display_name,
      username: row.username,
      avatarUrl: row.avatar_url,
      totalScore: Number(row.total_score),
      isCurrentUser: Boolean(row.is_current_user)
    }));
  } catch {
    return [];
  }
}
