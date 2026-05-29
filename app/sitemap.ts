import type { MetadataRoute } from "next";
import { getPublicGenresWithContent } from "@/lib/supabase/public-content";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: stories }, { data: episodes }, { data: authors }, { data: tags }, genres] = await Promise.all([
    supabase
      .from("stories")
      .select("id, slug, updated_at")
      .eq("visibility", "public")
      .in("status", ["published", "approved"]),
    supabase
      .from("episodes")
      .select("episode_number, updated_at, stories!inner(slug, visibility, status)")
      .in("status", ["published", "approved"])
      .eq("stories.visibility", "public")
      .in("stories.status", ["published", "approved"])
      .limit(5000),
    supabase
      .from("creator_profiles")
      .select("profiles!inner(username), updated_at")
      .eq("status", "active")
      .limit(3000),
    supabase.from("tags").select("slug").limit(1000),
    getPublicGenresWithContent()
  ]);

  const storyEntries: MetadataRoute.Sitemap = (stories ?? []).map((story) => ({
    url: `/truyen/${story.slug}`,
    lastModified: story.updated_at ? new Date(story.updated_at) : new Date()
  }));

  const chapterEntries = ((episodes ?? []) as Array<{
    episode_number: number;
    updated_at: string | null;
    stories: { slug: string } | { slug: string }[] | null;
  }>)
    .map((episode) => {
      const story = Array.isArray(episode.stories) ? episode.stories[0] : episode.stories;
      if (!story?.slug) return null;
      return {
        url: `/truyen/${story.slug}/chuong/${episode.episode_number}`,
        lastModified: episode.updated_at ? new Date(episode.updated_at) : new Date()
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const authorEntries = ((authors ?? []) as Array<{
    profiles: { username: string | null } | { username: string | null }[] | null;
    updated_at: string | null;
  }>)
    .map((author) => {
      const profile = Array.isArray(author.profiles) ? author.profiles[0] : author.profiles;
      if (!profile?.username) return null;
      return {
        url: `/tac-gia/${profile.username}`,
        lastModified: author.updated_at ? new Date(author.updated_at) : new Date()
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const genreEntries: MetadataRoute.Sitemap = genres
    .filter((genre) => genre.story_count > 0)
    .map((genre) => ({
      url: `/the-loai/${genre.slug}`,
      lastModified: new Date()
    }));

  const tagEntries: MetadataRoute.Sitemap = (tags ?? []).map((tag) => ({
    url: `/tag/${tag.slug}`,
    lastModified: new Date()
  }));

  return [
    { url: "/", lastModified: new Date() },
    { url: "/bang-xep-hang", lastModified: new Date() },
    { url: "/discover", lastModified: new Date() },
    { url: "/community", lastModified: new Date() },
    ...storyEntries,
    ...chapterEntries,
    ...authorEntries,
    ...genreEntries,
    ...tagEntries
  ];
}
