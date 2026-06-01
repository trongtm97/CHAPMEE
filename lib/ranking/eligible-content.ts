import type { SupabaseClient } from "@supabase/supabase-js";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { CREATOR_PROFILE_STORY_JOIN } from "@/lib/creator/supabase-selects";
import {
  loadMainGenreLabelsByStoryIds,
  pickMainGenreFromLabels
} from "@/lib/taxonomy/story-genre-labels";

export type EligibleStory = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  shortDescription: string | null;
  coverUrl: string | null;
  genreId: string | null;
  genreName: string | null;
  genreSlug: string | null;
  mainGenreTermId: string | null;
  isCompleted: boolean;
  publishedAt: string | null;
  authorUserId: string;
  creatorId: string | null;
  moderationStatus: string | null;
};

export type EligibleReel = {
  id: string;
  storyId: string | null;
  publishedAt: string | null;
  authorUserId: string;
};

export type EligibleChapter = {
  id: string;
  storyId: string;
  episodeNumber: number;
  title: string | null;
  publishedAt: string | null;
  authorUserId: string;
};

export type EligibleAuthor = {
  userId: string;
  creatorId: string;
  penName: string;
  username: string | null;
  avatarUrl: string | null;
  firstPublishedAt: string | null;
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function isEligibleModeration(status: string | null | undefined) {
  return status !== "flagged" && status !== "removed" && status !== "hidden";
}

export async function fetchEligibleStories(
  supabase: SupabaseClient,
  limit = 2000
): Promise<EligibleStory[]> {
  const { data, error } = await supabase
    .from("stories")
    .select(
      `id, title, slug, hook, short_description, cover_url, is_completed, published_at, moderation_status, ${CREATOR_PROFILE_STORY_JOIN}`
    )
    .in("status", [...publicContentStatuses])
    .eq("visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    title: string;
    slug: string;
    hook: string | null;
    short_description: string | null;
    cover_url: string | null;
    is_completed: boolean;
    published_at: string | null;
    moderation_status: string | null;
    creator_profiles:
      | { id: string; user_id: string }
      | { id: string; user_id: string }[]
      | null;
  }>).filter((row) => isEligibleModeration(row.moderation_status));

  const { loadStoryMainGenreTermIndex } = await import(
    "@/lib/ranking/story-main-genre-index"
  );
  const mainGenreIndex = await loadStoryMainGenreTermIndex(
    supabase,
    rows.map((row) => row.id)
  );
  const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
    supabase,
    rows.map((row) => row.id)
  );

  return rows
    .map((row) => {
      const taxonomy = taxonomyByStory.get(row.id);
      const creator = firstRelation(row.creator_profiles);
      const picked = pickMainGenreFromLabels(taxonomy);
      const mainGenreTermId = mainGenreIndex.get(row.id) ?? null;
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        hook: row.hook,
        shortDescription: row.short_description,
        coverUrl: row.cover_url,
        genreId: mainGenreTermId,
        mainGenreTermId,
        genreName: picked.genreName,
        genreSlug: picked.genreSlug,
        isCompleted: Boolean(row.is_completed),
        publishedAt: row.published_at,
        authorUserId: creator?.user_id ?? "",
        creatorId: creator?.id ?? null,
        moderationStatus: row.moderation_status
      };
    })
    .filter((row) => Boolean(row.authorUserId));
}

export async function fetchEligibleReels(
  supabase: SupabaseClient,
  limit = 800
): Promise<EligibleReel[]> {
  const { data, error } = await supabase
    .from("reels_items")
    .select("id, story_id, published_at, owner_id, status")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    storyId: (row.story_id as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    authorUserId: row.owner_id as string
  }));
}

export async function fetchEligibleChapters(
  supabase: SupabaseClient,
  limit = 600
): Promise<EligibleChapter[]> {
  const { data, error } = await supabase
    .from("episodes")
    .select(
      "id, story_id, episode_number, title, published_at, moderation_status, stories!inner(id, status, visibility, moderation_status, creator_profiles(user_id))"
    )
    .in("status", [...publicContentStatuses])
    .in("stories.status", [...publicContentStatuses])
    .eq("stories.visibility", "public")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as Array<{
    id: string;
    story_id: string;
    episode_number: number;
    title: string | null;
    published_at: string | null;
    moderation_status: string | null;
    stories:
      | {
          moderation_status: string | null;
          creator_profiles: { user_id: string } | { user_id: string }[] | null;
        }
      | Array<{
          moderation_status: string | null;
          creator_profiles: { user_id: string } | { user_id: string }[] | null;
        }>;
  }>)
    .filter((row) => {
      const story = firstRelation(row.stories);
      return (
        isEligibleModeration(row.moderation_status) &&
        isEligibleModeration(story?.moderation_status)
      );
    })
    .map((row) => {
      const story = firstRelation(row.stories);
      const creator = firstRelation(story?.creator_profiles ?? null);
      return {
        id: row.id,
        storyId: row.story_id,
        episodeNumber: row.episode_number,
        title: row.title,
        publishedAt: row.published_at,
        authorUserId: creator?.user_id ?? ""
      };
    })
    .filter((row) => Boolean(row.authorUserId));
}

export async function fetchEligibleAuthors(
  supabase: SupabaseClient,
  stories: EligibleStory[]
): Promise<EligibleAuthor[]> {
  const authorIds = [...new Set(stories.map((s) => s.authorUserId))];
  if (authorIds.length === 0) return [];

  const { data, error } = await supabase
    .from("creator_profiles")
    .select(
      "id, user_id, pen_name, status, profiles!creator_profiles_user_id_fkey(username, avatar_url)"
    )
    .in("user_id", authorIds)
    .eq("status", "active");

  if (error) throw error;

  const firstPublished = new Map<string, string>();
  for (const story of stories) {
    if (!story.publishedAt) continue;
    const prev = firstPublished.get(story.authorUserId);
    if (!prev || story.publishedAt < prev) {
      firstPublished.set(story.authorUserId, story.publishedAt);
    }
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    user_id: string;
    pen_name: string;
    profiles: { username: string | null; avatar_url: string | null } | null;
  }>).map((row) => {
    const profile = firstRelation(row.profiles);
    return {
      userId: row.user_id,
      creatorId: row.id,
      penName: row.pen_name,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      firstPublishedAt: firstPublished.get(row.user_id) ?? null
    };
  });
}

export async function fetchPublicGenres(supabase: SupabaseClient) {
  const { listTaxonomyMainGenresForRanking } = await import(
    "@/lib/taxonomy/ranking-bridge"
  );
  const genres = await listTaxonomyMainGenresForRanking(supabase);
  return genres.map((genre) => ({
    id: genre.termId,
    name: genre.name,
    slug: genre.slug
  }));
}
