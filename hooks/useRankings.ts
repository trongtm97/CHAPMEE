"use client";

import { useState, useEffect, useReducer, useCallback } from "react";
import type {
  RankingCategory,
  RankingTimePeriod,
  StoryRankingItem,
  AuthorRankingItem,
  FanRankingItem
} from "@/types/ranking";
import { createClient } from "@/lib/supabase/client";

export type RankingData = {
  hotStories: StoryRankingItem[];
  risingStories: StoryRankingItem[];
  topAuthors: AuthorRankingItem[];
  topFans: FanRankingItem[];
};

type RankingState = {
  data: RankingData;
  loading: boolean;
  error: string | null;
};

type RankingAction =
  | { type: "loading" }
  | { type: "success"; data: RankingData }
  | { type: "error"; error: string };

const emptyData: RankingData = {
  hotStories: [],
  risingStories: [],
  topAuthors: [],
  topFans: []
};

const RANKING_CACHE_TTL_MS = 120_000;
const rankingCache = new Map<string, { data: RankingData; fetchedAt: number }>();

function rankingCacheKey(category: RankingCategory, period: RankingTimePeriod) {
  return `${category}:${period}`;
}

function rankingReducer(
  _state: RankingState,
  action: RankingAction
): RankingState {
  switch (action.type) {
    case "loading":
      return { data: emptyData, loading: true, error: null };
    case "success":
      return { data: action.data, loading: false, error: null };
    case "error":
      return { data: emptyData, loading: false, error: action.error };
  }
}

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  published_at: string | null;
  genres: { name: string | null } | null | { name: string | null }[];
  creator_profiles:
    | { id: string | null; pen_name: string | null }
    | { id: string | null; pen_name: string | null }[]
    | null;
};

type ScoreRow = {
  story_id: string;
  score: number;
};

type AuthorRow = {
  author_id: string;
  user_id: string;
  pen_name: string;
  avatar_url: string | null;
  follower_count: number;
  story_count: number;
  total_reads: number;
  score: number;
};

type FanRow = {
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

function getTimePeriodStart(period: RankingTimePeriod): string | null {
  const now = Date.now();

  switch (period) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    }
    case "week":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
      return null;
  }
}

function toStoryRankingItem(
  row: StoryRow,
  score: number,
  rank: number
): StoryRankingItem {
  const genre = firstRelation(row.genres);
  const creator = firstRelation(row.creator_profiles);

  return {
    id: row.id,
    rank,
    title: row.title,
    slug: row.slug,
    hook: row.hook,
    shortDescription: row.short_description,
    genreName: genre?.name ?? null,
    creatorName: creator?.pen_name ?? null,
    creatorId: creator?.id ?? null,
    score
  };
}

async function fetchHotStories(
  supabase: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<StoryRankingItem[]> {
  const { data: scoresData } = await supabase.rpc("get_public_story_rankings", {
    window_start: windowStart,
    ranking_limit: limit
  });

  const scoreRows = ((scoresData ?? []) as ScoreRow[]).filter(
    (row) => row.score > 0
  );

  if (scoreRows.length === 0) {
    const { data: recentData } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, short_description, published_at, genres(name), creator_profiles(id, pen_name)"
      )
      .in("status", ["approved", "published"])
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(limit);

    return ((recentData ?? []) as unknown as StoryRow[]).map((row, index) =>
      toStoryRankingItem(row, 0, index + 1)
    );
  }

  const storyIds = scoreRows.map((row) => row.story_id);
  const { data } = await supabase
    .from("stories")
    .select(
      "id, title, slug, hook, short_description, published_at, genres(name), creator_profiles(id, pen_name)"
    )
    .in("id", storyIds)
    .in("status", ["approved", "published"])
    .eq("visibility", "public");

  const rowsMap = new Map(
    ((data ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );

  return scoreRows
    .map((scoreRow, index) => {
      const row = rowsMap.get(scoreRow.story_id);
      return row ? toStoryRankingItem(row, Number(scoreRow.score), index + 1) : null;
    })
    .filter((item): item is StoryRankingItem => item !== null);
}

async function fetchRisingStories(
  supabase: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<StoryRankingItem[]> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: scoresData } = await supabase.rpc("get_public_story_rankings", {
    window_start: windowStart ?? thirtyDaysAgo,
    ranking_limit: limit * 2
  });

  const scoreRows = ((scoresData ?? []) as ScoreRow[]).filter(
    (row) => row.score > 0
  );

  if (scoreRows.length === 0) return [];

  const storyIds = scoreRows.map((row) => row.story_id);
  const { data } = await supabase
    .from("stories")
    .select(
      "id, title, slug, hook, short_description, published_at, genres(name), creator_profiles(id, pen_name)"
    )
    .in("id", storyIds)
    .in("status", ["approved", "published"])
    .eq("visibility", "public")
    .gte("published_at", thirtyDaysAgo);

  const rowsMap = new Map(
    ((data ?? []) as unknown as StoryRow[]).map((row) => [row.id, row])
  );

  return scoreRows
    .map((scoreRow, index) => {
      const row = rowsMap.get(scoreRow.story_id);
      return row ? toStoryRankingItem(row, Number(scoreRow.score), index + 1) : null;
    })
    .filter((item): item is StoryRankingItem => item !== null)
    .slice(0, limit);
}

async function fetchTopAuthors(
  supabase: ReturnType<typeof createClient>,
  windowStart: string | null,
  limit: number
): Promise<AuthorRankingItem[]> {
  const { data, error } = await supabase.rpc("get_top_authors", {
    window_start: windowStart,
    ranking_limit: limit
  });

  if (error || !data) return [];

  return (data as AuthorRow[]).map((row, index) => ({
    id: row.author_id,
    rank: index + 1,
    userId: row.user_id,
    penName: row.pen_name,
    avatarUrl: row.avatar_url,
    followerCount: Number(row.follower_count),
    totalReads: Number(row.total_reads),
    storyCount: Number(row.story_count),
    score: Number(row.score)
  }));
}

async function fetchTopFans(
  supabase: ReturnType<typeof createClient>,
  limit: number
): Promise<FanRankingItem[]> {
  const { data, error } = await supabase.rpc("get_app_top_fans", {
    ranking_limit: limit,
    input_user_id: null
  });

  if (error || !data) return [];

  return (data as FanRow[]).map((row) => ({
    id: row.user_id,
    rank: Number(row.rank),
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    totalScore: Number(row.total_score),
    isCurrentUser: Boolean(row.is_current_user)
  }));
}

export function useRankings(
  initialCategory: RankingCategory = "hot_stories",
  initialPeriod: RankingTimePeriod = "week"
) {
  const [activeTab, setActiveTab] = useState<RankingCategory>(initialCategory);
  const [timePeriod, setTimePeriod] = useState<RankingTimePeriod>(initialPeriod);
  const [state, dispatch] = useReducer(rankingReducer, {
    data: emptyData,
    loading: true,
    error: null
  });

  const fetchData = useCallback(
    async (category: RankingCategory, period: RankingTimePeriod) => {
      const cacheKey = rankingCacheKey(category, period);
      const cached = rankingCache.get(cacheKey);
      const hasStaleCache =
        cached !== undefined && Date.now() - cached.fetchedAt < RANKING_CACHE_TTL_MS;

      if (hasStaleCache) {
        dispatch({ type: "success", data: cached.data });
      } else {
        dispatch({ type: "loading" });
      }

      const supabase = createClient();

      try {
        const windowStart = getTimePeriodStart(period);
        const results: RankingData = { ...emptyData };

        if (category === "hot_stories") {
          results.hotStories = await fetchHotStories(supabase, windowStart, 20);
        }

        if (category === "rising_stories") {
          results.risingStories = await fetchRisingStories(
            supabase,
            windowStart,
            20
          );
        }

        if (category === "top_authors") {
          results.topAuthors = await fetchTopAuthors(supabase, windowStart, 20);
        }

        if (category === "top_fans") {
          results.topFans = await fetchTopFans(supabase, 20);
        }

        rankingCache.set(cacheKey, { data: results, fetchedAt: Date.now() });
        dispatch({ type: "success", data: results });
      } catch {
        if (!hasStaleCache) {
          dispatch({
            type: "error",
            error: "Không thể tải dữ liệu xếp hạng."
          });
        }
      }
    },
    []
  );

  useEffect(() => {
    fetchData(activeTab, timePeriod);
  }, [activeTab, timePeriod, fetchData]);

  return {
    activeTab,
    setActiveTab,
    timePeriod,
    setTimePeriod,
    ...state
  };
}
