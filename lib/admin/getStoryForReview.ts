import { ADMIN_CREATOR_JOIN, resolveAdminCreatorName } from "@/lib/admin/creator-display";
import { createClient } from "@/lib/data/server";
import { loadStoryCatalogDisplayLabels } from "@/lib/taxonomy/story-genre-labels";

export type StoryForReview = {
  id: string;
  title: string;
  slug: string;
  publicCode: string;
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
  public_code: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  status: string;
  visibility: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  creator_profiles: unknown;
};

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getStoryForReview(
  storyId: string
): Promise<StoryForReviewResult> {
  try {
    const db = await createClient();
    const { data, error } = await db
      .from("stories")
      .select(
        `id, title, slug, public_code, hook, short_description, long_description, status, visibility, created_at, updated_at, published_at, ${ADMIN_CREATOR_JOIN}`
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
    const creator = firstRelation(story.creator_profiles);
    const catalogDisplay = await loadStoryCatalogDisplayLabels(db, story.id);

    return {
      error: null,
      notFound: false,
      story: {
        id: story.id,
        title: story.title,
        slug: story.slug,
        publicCode: story.public_code,
        hook: story.hook,
        shortDescription: story.short_description,
        longDescription: story.long_description,
        genreName: catalogDisplay.genreName,
        creatorName: resolveAdminCreatorName(creator),
        tags: catalogDisplay.tagNames,
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
