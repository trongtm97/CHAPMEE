import { createClient } from "@/lib/supabase/server";

export type StoryForReview = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  genreName: string | null;
  creatorName: string | null;
  tags: string[];
  status: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type StoryForReviewResult = {
  story: StoryForReview | null;
  notFound: boolean;
  error: string | null;
};

type StoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  genres: { name: string | null } | { name: string | null }[] | null;
  creator_profiles:
    | { pen_name: string | null }
    | { pen_name: string | null }[]
    | null;
};

type StoryTagRow = {
  tags: { name: string | null } | { name: string | null }[] | null;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryForReview(
  storyId: string
): Promise<StoryForReviewResult> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, short_description, long_description, status, visibility, created_at, updated_at, published_at, genres(name), creator_profiles(pen_name)"
      )
      .eq("id", storyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return { story: null, notFound: true, error: null };
    }

    const story = data as unknown as StoryRow;
    const { data: tagRows, error: tagError } = await supabase
      .from("story_tags")
      .select("tags(name)")
      .eq("story_id", story.id);

    if (tagError) {
      throw tagError;
    }

    const genre = firstRelation(story.genres);
    const creator = firstRelation(story.creator_profiles);

    return {
      error: null,
      notFound: false,
      story: {
        id: story.id,
        title: story.title,
        slug: story.slug,
        hook: story.hook,
        shortDescription: story.short_description,
        longDescription: story.long_description,
        genreName: genre?.name ?? null,
        creatorName: creator?.pen_name ?? null,
        tags: ((tagRows ?? []) as unknown as StoryTagRow[])
          .map((row) => firstRelation(row.tags)?.name)
          .filter((tag): tag is string => Boolean(tag)),
        status: story.status,
        visibility: story.visibility,
        createdAt: story.created_at,
        updatedAt: story.updated_at,
        publishedAt: story.published_at
      }
    };
  } catch (error) {
    return {
      story: null,
      notFound: false,
      error:
        error instanceof Error ? error.message : "Không thể tải truyện review."
    };
  }
}
