import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/postgrest-selects";

/** Minimal projection for story list cards — no structured_content or chapter bodies. */
export const STORY_CARD_LIST_SELECT = `id, public_code, slug, title, hook, short_description, cover_url, published_at, updated_at, is_completed, structure_type, standalone_reading_time_minutes, status, visibility, ${CREATOR_PROFILE_STORY_JOIN}`;

export const STORY_CARD_ID_SELECT =
  "id, hook, title, short_description, is_completed, published_at, updated_at";

export const STORY_CARD_TAXONOMY_TAG_LIMIT = 3;

export type StoryCardProjectionFields = {
  id: string;
  publicCode: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  coverUrl: string | null;
  mainGenreName: string | null;
  mainGenreSlug: string | null;
  featuredTags: string[];
  status: string | null;
  totalChapters: number;
  totalViews: number;
  totalSaves: number;
  updatedAt: string | null;
  creatorName: string | null;
  creatorUsername: string | null;
};
