import { getCurrentStoryImage } from "@/lib/images/get-current-story-image";
import { createClient } from "@/lib/supabase/server";
import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { CreatorStoryStatus } from "@/lib/creator/getCreatorStories";
import type { SensitiveFlag, StoryAgeRating } from "@/types/moderation";
import type { StoryImage } from "@/types/story-images";

export type StoryFormGenre = {
  id: string;
  name: string;
};

export type StoryFormTag = {
  id: string;
  name: string;
};

export type CreatorStoryFormStory = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  genre_id: string | null;
  status: CreatorStoryStatus;
  visibility: "public" | "private";
  is_completed: boolean;
  tagIds: string[];
  age_rating: StoryAgeRating;
  sensitive_flags: SensitiveFlag[];
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  canonical_url: string | null;
};

export type StoryFormData = {
  genres: StoryFormGenre[];
  tags: StoryFormTag[];
  story: CreatorStoryFormStory | null;
  currentImage: StoryImage | null;
  error: string | null;
};

type StoryTagRow = {
  tag_id: string;
};

export async function getStoryFormData(
  creatorProfile: CreatorProfile,
  storyId?: string
): Promise<StoryFormData> {
  try {
    const supabase = await createClient();
    const [genresResult, tagsResult] = await Promise.all([
      supabase.from("genres").select("id, name").order("name"),
      supabase.from("tags").select("id, name").order("name")
    ]);

    if (genresResult.error) {
      throw genresResult.error;
    }

    if (tagsResult.error) {
      throw tagsResult.error;
    }

    let story: CreatorStoryFormStory | null = null;
    let currentImage: StoryImage | null = null;

    if (storyId) {
      const { data: storyRow, error: storyError } = await supabase
        .from("stories")
        .select(
          "id, title, slug, hook, short_description, long_description, cover_url, genre_id, status, visibility, is_completed, age_rating, sensitive_flags, seo_title, seo_description, seo_keywords, canonical_url"
        )
        .eq("id", storyId)
        .eq("creator_id", creatorProfile.id)
        .maybeSingle();

      if (storyError) {
        throw storyError;
      }

      if (storyRow) {
        const [{ data: storyTagRows, error: storyTagsError }, currentImageResult] =
          await Promise.all([
            supabase.from("story_tags").select("tag_id").eq("story_id", storyRow.id),
            getCurrentStoryImage(supabase, storyRow.id)
          ]);

        if (storyTagsError) {
          throw storyTagsError;
        }

        currentImage = currentImageResult.image;

        const coverUrl =
          currentImage?.portraitUrl ??
          currentImage?.originalUrl ??
          storyRow.cover_url ??
          null;

        story = {
          ...(storyRow as Omit<CreatorStoryFormStory, "tagIds" | "cover_url">),
          cover_url: coverUrl,
          tagIds: ((storyTagRows ?? []) as StoryTagRow[]).map(
            (row) => row.tag_id
          )
        };
      }
    }

    return {
      error: null,
      currentImage,
      genres: (genresResult.data ?? []).map((genre) => ({
        id: String(genre.id),
        name: String(genre.name)
      })),
      story,
      tags: (tagsResult.data ?? []).map((tag) => ({
        id: String(tag.id),
        name: String(tag.name)
      }))
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Không thể tải dữ liệu form.",
      currentImage: null,
      genres: [],
      story: null,
      tags: []
    };
  }
}
