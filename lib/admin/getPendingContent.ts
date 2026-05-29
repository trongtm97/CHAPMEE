import { createClient } from "@/lib/supabase/server";

export type PendingStory = {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  genreName: string | null;
  creatorName: string | null;
  createdAt: string;
  status: "pending";
};

export type PendingEpisode = {
  id: string;
  storyId: string;
  storySlug: string;
  storyTitle: string;
  episodeNumber: number;
  title: string;
  excerpt: string | null;
  wordCount: number;
  creatorName: string | null;
  createdAt: string;
  status: "pending";
};

export type PendingContentData = {
  stories: PendingStory[];
  episodes: PendingEpisode[];
  error: string | null;
};

type StoryRow = {
  id: string;
  creator_id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  created_at: string;
  status: "pending";
  genres: { name: string | null } | { name: string | null }[] | null;
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
  word_count: number;
  created_at: string;
  status: "pending";
  stories:
    | {
        title: string | null;
        slug: string | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }
    | Array<{
        title: string | null;
        slug: string | null;
        creator_profiles:
          | { pen_name: string | null }
          | { pen_name: string | null }[]
          | null;
      }>
    | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getPendingContent(): Promise<PendingContentData> {
  try {
    const supabase = await createClient();
    const [storiesResult, episodesResult] = await Promise.all([
      supabase
        .from("stories")
        .select(
          "id, creator_id, title, slug, hook, short_description, created_at, status, genres(name), creator_profiles(pen_name)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("episodes")
        .select(
          "id, story_id, episode_number, title, excerpt, word_count, created_at, status, stories(title, slug, creator_profiles(pen_name))"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50)
    ]);

    if (storiesResult.error) {
      throw storiesResult.error;
    }

    if (episodesResult.error) {
      throw episodesResult.error;
    }

    return {
      error: null,
      stories: ((storiesResult.data ?? []) as unknown as StoryRow[]).map(
        (story) => {
          const genre = firstRelation(story.genres);
          const creator = firstRelation(story.creator_profiles);

          return {
            id: story.id,
            creatorId: story.creator_id,
            title: story.title,
            slug: story.slug,
            hook: story.hook,
            shortDescription: story.short_description,
            genreName: genre?.name ?? null,
            creatorName: creator?.pen_name ?? null,
            createdAt: story.created_at,
            status: story.status
          };
        }
      ),
      episodes: ((episodesResult.data ?? []) as unknown as EpisodeRow[]).map(
        (episode) => {
          const story = firstRelation(episode.stories);
          const creator = firstRelation(story?.creator_profiles);

          return {
            id: episode.id,
            storyId: episode.story_id,
            storySlug: story?.slug ?? "",
            storyTitle: story?.title ?? "Không rõ truyện",
            episodeNumber: episode.episode_number,
            title: episode.title,
            excerpt: episode.excerpt,
            wordCount: episode.word_count,
            creatorName: creator?.pen_name ?? null,
            createdAt: episode.created_at,
            status: episode.status
          };
        }
      )
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Không thể tải nội dung chờ duyệt.",
      stories: [],
      episodes: []
    };
  }
}
