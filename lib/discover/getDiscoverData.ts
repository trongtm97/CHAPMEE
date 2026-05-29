import { createPublicClient } from "@/lib/supabase/public-client";
import { getStoryRankingScores } from "@/lib/ranking/getTrendingStories";

export type DiscoverGenre = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type DiscoverStory = {
  id: string;
  title: string;
  slug: string;
  coverUrl: string | null;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  genreName: string | null;
  genreSlug: string | null;
  creatorName: string | null;
  isCompleted: boolean;
  publishedAt: string | null;
  tagNames: string[];
  score: number;
};

export type DiscoverCreatorSpotlight = {
  id: string;
  penName: string;
  storyCount: number;
};

export type DiscoverData = {
  genres: DiscoverGenre[];
  searchResults: DiscoverStory[];
  hot24h: DiscoverStory[];
  hot7d: DiscoverStory[];
  newStories: DiscoverStory[];
  updatedStories: DiscoverStory[];
  completedStories: DiscoverStory[];
  shortReads: DiscoverStory[];
  risingCreators: DiscoverCreatorSpotlight[];
  error: string | null;
};

type DiscoverParams = {
  query?: string;
  genre?: string;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  is_completed: boolean | null;
  published_at: string | null;
  genres: { name: string | null; slug: string | null } | null;
  creator_profiles:
    | { id: string; pen_name: string | null }
    | { id: string; pen_name: string | null }[]
    | null;
};

type StoryTagRow = {
  story_id: string;
  tags: { name: string | null; slug: string | null } | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

function includesSearch(value: string | null | undefined, query: string) {
  return value?.toLowerCase().includes(query) ?? false;
}

function toDiscoverStory(
  row: StoryRow,
  tagsByStory: Map<string, string[]>,
  scoreByStory: Map<string, number>
): DiscoverStory {
  const genre = firstRelation(row.genres);
  const creator = firstRelation(row.creator_profiles);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    coverUrl: row.cover_url,
    hook: row.hook,
    shortDescription: row.short_description,
    longDescription: row.long_description,
    genreName: genre?.name ?? null,
    genreSlug: genre?.slug ?? null,
    creatorName: creator?.pen_name ?? null,
    isCompleted: Boolean(row.is_completed),
    publishedAt: row.published_at,
    tagNames: tagsByStory.get(row.id) ?? [],
    score: scoreByStory.get(row.id) ?? 0
  };
}

async function getTagsByStory(storyIds: string[]) {
  const tagsByStory = new Map<string, string[]>();

  if (storyIds.length === 0) {
    return tagsByStory;
  }

  const supabase = createPublicClient();
  const { data } = await supabase
    .from("story_tags")
    .select("story_id, tags(name, slug)")
    .in("story_id", storyIds);

  for (const row of (data ?? []) as unknown as StoryTagRow[]) {
    const tag = firstRelation(row.tags);

    if (!tag?.name) {
      continue;
    }

    tagsByStory.set(row.story_id, [
      ...(tagsByStory.get(row.story_id) ?? []),
      tag.name
    ]);
  }

  return tagsByStory;
}

function buildRisingCreators(rows: StoryRow[]): DiscoverCreatorSpotlight[] {
  const counts = new Map<string, DiscoverCreatorSpotlight>();

  for (const row of rows) {
    const creator = firstRelation(row.creator_profiles);
    if (!creator?.id) {
      continue;
    }
    const existing = counts.get(creator.id);
    if (existing) {
      existing.storyCount += 1;
      continue;
    }
    counts.set(creator.id, {
      id: creator.id,
      penName: creator.pen_name?.trim() || "Tác giả ChapMee",
      storyCount: 1
    });
  }

  return [...counts.values()]
    .sort((first, second) => second.storyCount - first.storyCount)
    .slice(0, 8);
}

function filterStories(
  stories: DiscoverStory[],
  params: Required<DiscoverParams>
) {
  const query = params.query.trim().toLowerCase();

  return stories.filter((story) => {
    const matchesGenre = params.genre ? story.genreSlug === params.genre : true;

    if (!matchesGenre) {
      return false;
    }

    if (!query) {
      return true;
    }

    return (
      includesSearch(story.title, query) ||
      includesSearch(story.hook, query) ||
      includesSearch(story.shortDescription, query) ||
      includesSearch(story.longDescription, query) ||
      includesSearch(story.genreName, query) ||
      story.tagNames.some((tagName) => includesSearch(tagName, query))
    );
  });
}

export async function getDiscoverData(
  params: DiscoverParams = {}
): Promise<DiscoverData> {
  try {
    const normalizedParams = {
      query: params.query ?? "",
      genre: params.genre ?? ""
    };
    const supabase = createPublicClient();

    const [{ data: genreRows }, { data: storyRows, error: storiesError }] =
      await Promise.all([
        supabase
          .from("genres")
          .select("id, name, slug, description")
          .order("name"),
        supabase
          .from("stories")
          .select(
            "id, title, slug, cover_url, hook, short_description, long_description, is_completed, published_at, genres(name, slug), creator_profiles(id, pen_name)"
          )
          .in("status", ["published", "approved"])
          .eq("visibility", "public")
          .order("published_at", { ascending: false })
          .limit(50)
      ]);

    if (storiesError) {
      throw storiesError;
    }

    const storyRowsTyped = (storyRows ?? []) as unknown as StoryRow[];
    const storyIds = storyRowsTyped.map((story) => story.id);
    const [tagsByStory, scoreByStory24h, scoreByStory7d] = await Promise.all([
      getTagsByStory(storyIds),
      getStoryRankingScores("24h", 50),
      getStoryRankingScores("7d", 50)
    ]);
    const stories = storyRowsTyped.map((story) =>
      toDiscoverStory(story, tagsByStory, scoreByStory24h)
    );
    const filteredStories = filterStories(stories, normalizedParams);
    const hot24hSource = filteredStories.some((story) => story.score > 0)
      ? filteredStories
      : filteredStories.slice(0, 8);
    const hot7dStories = storyRowsTyped.map((story) =>
      toDiscoverStory(story, tagsByStory, scoreByStory7d)
    );
    const filteredHot7dStories = filterStories(hot7dStories, normalizedParams);
    const hot7dSource = filteredHot7dStories.some((story) => story.score > 0)
      ? filteredHot7dStories
      : filteredHot7dStories.slice(0, 8);

    return {
      genres: (genreRows ?? []).map((genre) => ({
        id: String(genre.id),
        name: String(genre.name),
        slug: String(genre.slug),
        description: genre.description ? String(genre.description) : null
      })),
      searchResults:
        normalizedParams.query || normalizedParams.genre ? filteredStories : [],
      hot24h: [...hot24hSource]
        .sort((first, second) => second.score - first.score)
        .slice(0, 8),
      hot7d: [...hot7dSource]
        .sort((first, second) => second.score - first.score)
        .slice(0, 8),
      newStories: filteredStories.slice(0, 8),
      updatedStories: [...filteredStories]
        .sort((first, second) => {
          const firstTime = first.publishedAt ? new Date(first.publishedAt).getTime() : 0;
          const secondTime = second.publishedAt ? new Date(second.publishedAt).getTime() : 0;
          return secondTime - firstTime;
        })
        .slice(0, 6),
      completedStories: filteredStories
        .filter((story) => story.isCompleted)
        .slice(0, 8),
      shortReads: filteredStories
        .filter(
          (story) =>
            story.genreSlug === "truyen-ngan" ||
            story.tagNames.includes("twist cuối") ||
            story.genreName === "Truyện ngắn"
        )
        .slice(0, 8),
      risingCreators: buildRisingCreators(storyRowsTyped),
      error: null
    };
  } catch (error) {
    return {
      genres: [],
      searchResults: [],
      hot24h: [],
      hot7d: [],
      newStories: [],
      updatedStories: [],
      completedStories: [],
      shortReads: [],
      risingCreators: [],
      error:
        error instanceof Error ? error.message : "Could not load discover data."
    };
  }
}
