import { CREATOR_PROFILE_PUBLIC_SELECT } from "@/lib/creator/supabase-selects";
import { resolvePublicDisplayName } from "@/lib/profile/resolve-public-display-name";
import { PERMANENTLY_HIDDEN_QUALITY_STATUS } from "@/lib/content-quality/public-visibility";
import { createPublicClient } from "@/lib/supabase/public-client";
import { logSupabaseError, withSupabaseFallback } from "@/lib/supabase/safe-query";

export type PublicStoryRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  short_description: string | null;
  long_description: string | null;
  cover_url: string | null;
  published_at: string | null;
  creator_profiles:
    | { id: string; pen_name: string | null; profiles: { username: string | null; avatar_url: string | null } | null }
    | { id: string; pen_name: string | null; profiles: { username: string | null; avatar_url: string | null } | null }[]
    | null;
};

export type PublicStoryPreview = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  coverUrl: string | null;
  creatorName: string | null;
  genreName: string | null;
  genreSlug: string | null;
  publishedAt: string | null;
};

type StoryPreviewRow = {
  id: string;
  title: string;
  slug: string;
  hook: string | null;
  cover_url: string | null;
  published_at: string | null;
  creator_profiles:
    | {
        pen_name: string | null;
        profiles?:
          | { display_name: string | null; username: string | null }
          | { display_name: string | null; username: string | null }[]
          | null;
      }
    | {
        pen_name: string | null;
        profiles?:
          | { display_name: string | null; username: string | null }
          | { display_name: string | null; username: string | null }[]
          | null;
      }[]
    | null;
};

export async function getPublicStoryBySlug(slug: string) {
  return withSupabaseFallback("getPublicStoryBySlug", async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("stories")
      .select(
        `id, title, slug, hook, short_description, long_description, cover_url, published_at, creator_profiles(${CREATOR_PROFILE_PUBLIC_SELECT})`
      )
      .eq("slug", slug)
      .eq("visibility", "public")
      .in("status", ["published", "approved"])
      .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
      .maybeSingle();

    if (error) {
      logSupabaseError("getPublicStoryBySlug", error);
      return null;
    }

    return data as PublicStoryRow | null;
  }, null);
}

function firstRelation<T>(relation: T | T[] | null | undefined) {
  return Array.isArray(relation) ? (relation[0] ?? null) : (relation ?? null);
}

export async function getPublicGenresWithContent() {
  return withSupabaseFallback("getPublicGenresWithContent", async () => {
    const supabase = createPublicClient();
    const { getPublicMainGenresWithStoryCounts, hasTaxonomyMainGenres } =
      await import("@/lib/taxonomy/public-genres");

  if (await hasTaxonomyMainGenres(supabase)) {
    const taxonomyGenres = await getPublicMainGenresWithStoryCounts(supabase);
    return taxonomyGenres;
  }

  return [];
}, []);
}

export async function getPublicStories(limit = 6): Promise<PublicStoryPreview[]> {
  return withSupabaseFallback("getPublicStories", async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("stories")
      .select(
        `id, title, slug, hook, cover_url, published_at, creator_profiles(${CREATOR_PROFILE_PUBLIC_SELECT})`
      )
      .eq("visibility", "public")
      .in("status", ["published", "approved"])
      .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      logSupabaseError("getPublicStories", error);
      return [];
    }

    const rows = (data ?? []) as StoryPreviewRow[];
    const { loadMainGenreLabelsByStoryIds, pickMainGenreFromLabels } = await import(
      "@/lib/taxonomy/story-genre-labels"
    );
    const taxonomyByStory = await loadMainGenreLabelsByStoryIds(
      supabase,
      rows.map((row) => row.id)
    );

    return rows.map((row) => {
      const creator = firstRelation(row.creator_profiles);
      const picked = pickMainGenreFromLabels(taxonomyByStory.get(row.id));
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        hook: row.hook,
        coverUrl: row.cover_url,
        creatorName: creator
          ? resolvePublicDisplayName(firstRelation(creator.profiles), creator)
          : null,
        genreName: picked.genreName,
        genreSlug: picked.genreSlug,
        publishedAt: row.published_at
      };
    });
  }, []);
}
