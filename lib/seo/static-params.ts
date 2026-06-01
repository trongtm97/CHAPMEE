import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { buildStorySegment, buildChapterSegment } from "@/lib/urls/paths";

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

export async function getPublicStorySlugs(limit = 500) {
  const segments = await getPublicStorySegments(limit);
  return segments.map((segment) => segment.replace(/-s\.[0-9]{8,12}$/, ""));
}

export async function getPublicStorySegments(limit = 500) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("stories")
    .select("slug, public_code")
    .eq("visibility", "public")
    .in("status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .filter((row) => row.slug && row.public_code)
    .map((row) => buildStorySegment(String(row.slug), String(row.public_code)));
}

export async function getPublicChapterParams(limit = 1000) {
  const segments = await getPublicChapterSegments(limit);
  return segments.map(({ storySegment, chapterSegment }) => ({
    slug: storySegment,
    chapter: chapterSegment
  }));
}

export async function getPublicChapterSegments(limit = 1000) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("episodes")
    .select("slug, public_code, stories!inner(slug, public_code, visibility, status, structure_type)")
    .in("status", ["approved", "published"])
    .eq("stories.visibility", "public")
    .in("stories.status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<{
    slug: string;
    public_code: string;
    stories: { slug: string; public_code: string; structure_type?: string | null } | { slug: string; public_code: string; structure_type?: string | null }[] | null;
  }>)
    .map((row) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      if (!story?.slug || !story.public_code || !row.slug || !row.public_code) {
        return null;
      }
      if (story.structure_type === "standalone") {
        return null;
      }
      return {
        storySegment: buildStorySegment(story.slug, story.public_code),
        chapterSegment: buildChapterSegment(row.slug, row.public_code)
      };
    })
    .filter(
      (row): row is { storySegment: string; chapterSegment: string } => Boolean(row)
    );
}

export async function getPublicAuthorUsernames(limit = 300) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .not("username", "is", null)
    .eq("status", "active")
    .limit(limit);

  return (data ?? [])
    .map((row) => String((row as { username: string }).username).trim())
    .filter(Boolean);
}

export async function getPublicGenreSlugs() {
  const supabase = getPublicClient();
  if (!supabase) return [];

  const { hasTaxonomyMainGenres, getPublicMainGenreSlugs } = await import(
    "@/lib/taxonomy/public-genres"
  );

  if (await hasTaxonomyMainGenres(supabase)) {
    const taxonomySlugs = await getPublicMainGenreSlugs(supabase);
    return taxonomySlugs;
  }

  return [];
}

export async function getTagSlugs(limit = 500) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("taxonomy_terms")
    .select("slug")
    .eq("type", "trope_tag")
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_seo", true)
    .order("sort_order", { ascending: true })
    .limit(limit);
  return (data ?? [])
    .map((row) => String((row as { slug: string }).slug))
    .filter(Boolean);
}
