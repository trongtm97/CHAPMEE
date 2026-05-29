import { createClient as createSupabaseClient } from "@supabase/supabase-js";

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}

export async function getPublicStorySlugs(limit = 500) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("stories")
    .select("slug")
    .eq("visibility", "public")
    .in("status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((row) => String((row as { slug: string }).slug))
    .filter(Boolean);
}

export async function getPublicChapterParams(limit = 1000) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("episodes")
    .select("episode_number, stories!inner(slug, visibility, status)")
    .in("status", ["approved", "published"])
    .eq("stories.visibility", "public")
    .in("stories.status", ["approved", "published"])
    .order("published_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as Array<{
    episode_number: number;
    stories: { slug: string } | { slug: string }[] | null;
  }>)
    .map((row) => {
      const story = Array.isArray(row.stories) ? row.stories[0] : row.stories;
      if (!story?.slug) return null;
      return {
        slug: story.slug,
        chapter: String(row.episode_number)
      };
    })
    .filter((row): row is { slug: string; chapter: string } => Boolean(row));
}

export async function getPublicAuthorUsernames(limit = 300) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("creator_profiles")
    .select("profiles!inner(username)")
    .eq("status", "active")
    .limit(limit);

  return ((data ?? []) as Array<{
    profiles: { username: string | null } | { username: string | null }[] | null;
  }>)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      return profile?.username?.trim() ?? "";
    })
    .filter(Boolean);
}

export async function getPublicGenreSlugs() {
  const supabase = getPublicClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("genres")
    .select("slug")
    .order("name", { ascending: true })
    .limit(300);
  return (data ?? [])
    .map((row) => String((row as { slug: string }).slug))
    .filter(Boolean);
}

export async function getTagSlugs(limit = 500) {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tags").select("slug").limit(limit);
  return (data ?? [])
    .map((row) => String((row as { slug: string }).slug))
    .filter(Boolean);
}
