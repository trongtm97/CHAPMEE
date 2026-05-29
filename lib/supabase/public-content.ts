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
  genres: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
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
  creator_profiles: { pen_name: string | null } | { pen_name: string | null }[] | null;
  genres: { name: string | null; slug: string | null } | { name: string | null; slug: string | null }[] | null;
};

export async function getPublicStoryBySlug(slug: string) {
  return withSupabaseFallback("getPublicStoryBySlug", async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("stories")
      .select(
        "id, title, slug, hook, short_description, long_description, cover_url, published_at, creator_profiles(id, pen_name, profiles(username, avatar_url)), genres(name, slug)"
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
    const { data, error } = await supabase.rpc("get_public_genres_with_story_counts");

    if (!error && Array.isArray(data)) {
      return data as Array<{ slug: string; name: string; story_count: number }>;
    }

    const { data: genreRows, error: genreError } = await supabase
      .from("genres")
      .select("slug, name")
      .order("name");

    if (genreError) {
      logSupabaseError("getPublicGenresWithContent", genreError);
      return [];
    }

    return (genreRows ?? []).map((genre) => ({
      slug: String(genre.slug),
      name: String(genre.name),
      story_count: 0
    }));
  }, []);
}

export async function getPublicStories(limit = 6): Promise<PublicStoryPreview[]> {
  return withSupabaseFallback("getPublicStories", async () => {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("stories")
      .select("id, title, slug, hook, cover_url, published_at, creator_profiles(pen_name), genres(name, slug)")
      .eq("visibility", "public")
      .in("status", ["published", "approved"])
      .neq("quality_status", PERMANENTLY_HIDDEN_QUALITY_STATUS)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (error) {
      logSupabaseError("getPublicStories", error);
      return [];
    }

    return ((data ?? []) as StoryPreviewRow[]).map((row) => {
      const creator = firstRelation(row.creator_profiles);
      const genre = firstRelation(row.genres);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        hook: row.hook,
        coverUrl: row.cover_url,
        creatorName: creator?.pen_name ?? null,
        genreName: genre?.name ?? null,
        genreSlug: genre?.slug ?? null,
        publishedAt: row.published_at
      };
    });
  }, []);
}
