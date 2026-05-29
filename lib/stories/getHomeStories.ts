import { createClient } from "@/lib/supabase/server";
import {
  getContinueReading,
  type ContinueReadingItem
} from "@/lib/reading/getContinueReading";
import { getStoryRankingScores } from "@/lib/ranking/getTrendingStories";

export type HomeStory = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  genreName: string | null;
  genreSlug: string | null;
  creatorName: string | null;
  coverUrl: string | null;
  episodeCount: number;
};

export type NewChapterItem = {
  id: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  story: HomeStory;
};

export type FeaturedCreator = {
  id: string;
  penName: string;
  bio: string | null;
  avatarUrl: string | null;
};

export type HomeData = {
  continueReading: ContinueReadingItem[];
  featuredStory: HomeStory | null;
  forYou: HomeStory[];
  newChapters: NewChapterItem[];
  trending: HomeStory[];
  featuredCreators: FeaturedCreator[];
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  cover_url: string | null;
  genres:
    | { name: string | null; slug: string | null }
    | { name: string | null; slug: string | null }[]
    | null;
  creator_profiles:
    | { pen_name: string | null }
    | { pen_name: string | null }[]
    | null;
};

type EpisodeRow = {
  id: string;
  story_id: string;
  episode_number: number;
  title: string;
  excerpt: string | null;
  published_at: string | null;
  stories: StoryRow | null;
};

type CreatorRow = {
  id: string;
  pen_name: string | null;
  bio: string | null;
  profiles:
    | { avatar_url: string | null }
    | { avatar_url: string | null }[]
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function sortStoriesByRanking(
  stories: StoryRow[],
  rankingScores: Map<string, number>
) {
  return [...stories].sort((first, second) => {
    const scoreDelta =
      (rankingScores.get(second.id) ?? 0) - (rankingScores.get(first.id) ?? 0);

    return scoreDelta;
  });
}

function toHomeStory(row: StoryRow, episodeCountByStory: Map<string, number>) {
  const genre = firstRelation(row.genres);
  const creator = firstRelation(row.creator_profiles);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    hook: row.hook,
    coverUrl: row.cover_url,
    genreName: genre?.name ?? null,
    genreSlug: genre?.slug ?? null,
    creatorName: creator?.pen_name ?? null,
    episodeCount: episodeCountByStory.get(row.id) ?? 0
  };
}

async function getEpisodeCounts(storyIds: string[]) {
  const counts = new Map<string, number>();

  if (storyIds.length === 0) {
    return counts;
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("episodes")
    .select("story_id")
    .in("story_id", storyIds)
    .in("status", ["published", "approved"]);

  for (const episode of data ?? []) {
    const storyId = String(episode.story_id);
    counts.set(storyId, (counts.get(storyId) ?? 0) + 1);
  }

  return counts;
}

function pickUniqueStories(
  primary: StoryRow[],
  fallback: StoryRow[],
  limit: number,
  excludedIds: Set<string>
) {
  const picked: StoryRow[] = [];

  for (const story of primary) {
    if (excludedIds.has(story.id)) {
      continue;
    }

    picked.push(story);
    excludedIds.add(story.id);

    if (picked.length >= limit) {
      return picked;
    }
  }

  for (const story of fallback) {
    if (excludedIds.has(story.id)) {
      continue;
    }

    picked.push(story);
    excludedIds.add(story.id);

    if (picked.length >= limit) {
      break;
    }
  }

  return picked;
}

type NewChapterResult = {
  id: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  story: HomeStory;
};

function buildUniqueNewChapters(
  rows: EpisodeRow[],
  episodeCounts: Map<string, number>,
  limit: number
) {
  const unique: NewChapterResult[] = [];
  const uniqueStoryIds = new Set<string>();
  const fallback: NewChapterResult[] = [];

  for (const episode of rows) {
    const story = firstRelation(episode.stories);

    if (!story) {
      continue;
    }

    const item: NewChapterResult = {
      id: episode.id,
      episodeNumber: Number(episode.episode_number ?? 0),
      title: episode.title,
      excerpt: episode.excerpt,
      publishedAt: episode.published_at,
      story: toHomeStory(story as StoryRow, episodeCounts)
    };

    fallback.push(item);

    if (uniqueStoryIds.has(item.story.id)) {
      continue;
    }

    uniqueStoryIds.add(item.story.id);
    unique.push(item);

    if (unique.length >= limit) {
      return unique;
    }
  }

  if (unique.length >= limit) {
    return unique;
  }

  for (const item of fallback) {
    if (unique.some((existing) => existing.id === item.id)) {
      continue;
    }

    unique.push(item);

    if (unique.length >= limit) {
      break;
    }
  }

  return unique.slice(0, limit);
}

export async function getHomeStories(userId?: string): Promise<HomeData> {
  try {
    const supabase = await createClient();

    const { data: storyRows, error: storiesError } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, cover_url, genres(name, slug), creator_profiles(pen_name)"
      )
      .in("status", ["published", "approved"])
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(50);

    if (storiesError) {
      throw storiesError;
    }

    const stories = (storyRows ?? []) as unknown as StoryRow[];
    const storyIds = stories.map((story) => story.id);
    const [episodeCounts, rankingScores24h, rankingScores7d] =
      await Promise.all([
        getEpisodeCounts(storyIds),
        getStoryRankingScores("24h", 50),
        getStoryRankingScores("7d", 50)
      ]);

    const storiesBy24h = sortStoriesByRanking(stories, rankingScores24h);
    const storiesBy7d = sortStoriesByRanking(stories, rankingScores7d);
    const featuredStoryRow = storiesBy24h[0] ?? stories[0] ?? null;
    const featuredStory = featuredStoryRow
      ? toHomeStory(featuredStoryRow, episodeCounts)
      : null;
    const featuredId = featuredStory?.id ?? null;

    const forYouPrimary = storiesBy7d.filter(
      (story) => (rankingScores7d.get(story.id) ?? 0) > 0
    );
    const forYouRows = pickUniqueStories(
      forYouPrimary.length >= 3 ? forYouPrimary : storiesBy7d,
      stories,
      4,
      new Set(featuredId ? [featuredId] : [])
    );
    const forYou = forYouRows.map((story) => toHomeStory(story, episodeCounts));

    const trendingPrimary = storiesBy24h.filter(
      (story) => (rankingScores24h.get(story.id) ?? 0) > 0
    );
    const trendingExcluded = new Set<string>(
      featuredId ? [featuredId] : []
    );
    for (const story of forYouRows) {
      trendingExcluded.add(story.id);
    }
    const trendingRows = pickUniqueStories(
      trendingPrimary.length >= 3 ? trendingPrimary : storiesBy24h,
      stories,
      4,
      trendingExcluded
    );
    const trending = trendingRows.map((story) => toHomeStory(story, episodeCounts));

    const { data: episodeRows } = await supabase
      .from("episodes")
      .select(
        "id, story_id, episode_number, title, excerpt, published_at, stories(id, title, slug, hook, cover_url, genres(name, slug), creator_profiles(pen_name))"
      )
      .in("status", ["published", "approved"])
      .order("published_at", { ascending: false })
      .limit(12);

    const newChapters = buildUniqueNewChapters(
      (episodeRows ?? []) as unknown as EpisodeRow[],
      episodeCounts,
      3
    );

    const { items: continueReading } = await getContinueReading(userId, 3);

    const { data: creatorRows } = await supabase
      .from("creator_profiles")
      .select("id, pen_name, bio, profiles(avatar_url)")
      .eq("status", "active")
      .limit(1);

    const featuredCreators = ((creatorRows ?? []) as unknown as CreatorRow[]).map(
      (creator) => ({
        id: String(creator.id),
        penName: String(creator.pen_name ?? ""),
        bio: creator.bio ? String(creator.bio) : null,
        avatarUrl: firstRelation(creator.profiles)?.avatar_url ?? null
      })
    );

    return {
      continueReading,
      featuredStory,
      forYou,
      newChapters,
      trending,
      featuredCreators,
      error: null
    };
  } catch (error) {
    return {
      continueReading: [],
      featuredStory: null,
      forYou: [],
      newChapters: [],
      trending: [],
      featuredCreators: [],
      error:
        error instanceof Error ? error.message : "Could not load home stories."
    };
  }
}
