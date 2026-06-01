import type { MetadataRoute } from "next";

import { getTaxonomySitemapPaths } from "@/lib/discovery/sitemap-taxonomy";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { shouldNoIndexPath } from "@/lib/seo/noindex";
import { SITEMAP_SEGMENT_IDS, type SitemapSegmentId } from "@/lib/seo/sitemap-segments";
import { createClient } from "@/lib/supabase/server";
import {
  getAnnouncementUrl,
  getChapterUrl,
  getContentPostUrl,
  getPolicyUrl,
  getProfileUrl,
  getReelUrl,
  getStoryUrl
} from "@/lib/seo/canonical";

const UUID_IN_PATH = /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/|$)/i;

export function isBlockedSitemapPathname(pathname: string): boolean {
  return (
    pathname.includes("?") ||
    UUID_IN_PATH.test(pathname) ||
    shouldNoIndexPath(pathname)
  );
}

export function toSitemapEntry(
  pathname: string,
  lastModified?: Date | string | null,
  extra?: Pick<MetadataRoute.Sitemap[number], "priority" | "changeFrequency">
): MetadataRoute.Sitemap[number] | null {
  if (isBlockedSitemapPathname(pathname)) return null;
  const url = buildCanonicalUrl(pathname);
  if (!url) return null;
  return {
    url,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    ...extra
  };
}

const STATIC_PATHS = [
  "/",
  "/discover",
  "/reels",
  "/truyen",
  "/bai-viet",
  "/chinh-sach",
  "/thong-bao",
  "/community",
  "/bang-xep-hang"
];

export async function buildStaticSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    const entry = toSitemapEntry(path);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildStorySitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: stories } = await supabase
    .from("stories")
    .select("slug, public_code, updated_at")
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .not("public_code", "is", null);

  const entries: MetadataRoute.Sitemap = [];
  for (const story of stories ?? []) {
    const entry = toSitemapEntry(
      getStoryUrl({ slug: String(story.slug), public_code: String(story.public_code) }),
      story.updated_at
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildChapterSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: episodes } = await supabase
    .from("episodes")
    .select(
      "id, slug, public_code, updated_at, stories!inner(slug, public_code, visibility, status, structure_type)"
    )
    .in("status", ["published", "approved"])
    .eq("stories.visibility", "public")
    .in("stories.status", ["published", "approved"])
    .not("public_code", "is", null)
    .limit(5000);

  const episodeIds = (episodes ?? []).map((row) => String(row.id));
  const paidChapterIds = new Set<string>();

  if (episodeIds.length > 0) {
    const { data: monetization } = await supabase
      .from("chapter_monetization_settings")
      .select("chapter_id, is_paid, coin_price")
      .in("chapter_id", episodeIds)
      .eq("is_paid", true);

    for (const row of monetization ?? []) {
      if (Number(row.coin_price ?? 0) > 0) {
        paidChapterIds.add(String(row.chapter_id));
      }
    }
  }

  const entries: MetadataRoute.Sitemap = [];
  for (const episode of episodes ?? []) {
    if (paidChapterIds.has(String(episode.id))) continue;
    const story = Array.isArray(episode.stories) ? episode.stories[0] : episode.stories;
    if (!story?.public_code || !episode.public_code || !episode.slug) continue;
    if (story.structure_type === "standalone") continue;

    const entry = toSitemapEntry(
      getChapterUrl(
        { slug: story.slug, public_code: story.public_code },
        { slug: episode.slug, public_code: episode.public_code }
      ),
      episode.updated_at
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildTaxonomySitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const paths = await getTaxonomySitemapPaths();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of paths) {
    const entry = toSitemapEntry(path.pathname, path.lastModified, {
      priority: path.priority,
      changeFrequency: path.changeFrequency
    });
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildAuthorSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: authors } = await supabase
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null)
    .eq("status", "active")
    .limit(3000);

  const entries: MetadataRoute.Sitemap = [];
  for (const author of authors ?? []) {
    const profileUrl = getProfileUrl(author.username);
    if (!profileUrl) continue;
    const entry = toSitemapEntry(profileUrl, author.updated_at);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildPostsSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: contentPosts }, { data: announcements }] = await Promise.all([
    supabase
      .from("admin_content_posts")
      .select("slug, public_code, updated_at")
      .eq("status", "published")
      .eq("indexable", true)
      .not("public_code", "is", null),
    supabase
      .from("platform_announcements")
      .select("slug, public_code, updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("indexable", true)
      .not("public_code", "is", null)
  ]);

  const entries: MetadataRoute.Sitemap = [];

  for (const post of contentPosts ?? []) {
    const entry = toSitemapEntry(
      getContentPostUrl({ slug: post.slug, public_code: post.public_code }),
      post.updated_at
    );
    if (entry) entries.push(entry);
  }

  for (const announcement of announcements ?? []) {
    const entry = toSitemapEntry(
      getAnnouncementUrl({
        slug: announcement.slug,
        public_code: announcement.public_code
      }),
      announcement.updated_at
    );
    if (entry) entries.push(entry);
  }

  return entries;
}

export async function buildPoliciesSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: policies } = await supabase
    .from("policy_pages")
    .select("slug, public_code, updated_at")
    .eq("status", "published")
    .eq("visibility", "public")
    .eq("seo_indexable", true)
    .not("public_code", "is", null);

  const entries: MetadataRoute.Sitemap = [];
  for (const policy of policies ?? []) {
    const entry = toSitemapEntry(
      getPolicyUrl({ slug: policy.slug, public_code: policy.public_code }),
      policy.updated_at
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildReelsSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const { data: reels } = await supabase
    .from("reels_items")
    .select("slug, public_code, updated_at")
    .eq("status", "published")
    .not("public_code", "is", null)
    .limit(2000);

  const entries: MetadataRoute.Sitemap = [];
  for (const reel of reels ?? []) {
    const entry = toSitemapEntry(
      getReelUrl({ slug: reel.slug, public_code: reel.public_code }),
      reel.updated_at
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

const SEGMENT_BUILDERS: Record<SitemapSegmentId, () => Promise<MetadataRoute.Sitemap>> = {
  static: buildStaticSitemapEntries,
  stories: buildStorySitemapEntries,
  chapters: buildChapterSitemapEntries,
  taxonomy: buildTaxonomySitemapEntries,
  authors: buildAuthorSitemapEntries,
  posts: buildPostsSitemapEntries,
  policies: buildPoliciesSitemapEntries,
  reels: buildReelsSitemapEntries
};

export async function buildSitemapSegmentEntries(
  segmentId: SitemapSegmentId
): Promise<MetadataRoute.Sitemap> {
  return SEGMENT_BUILDERS[segmentId]();
}

export async function buildAllPublicSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  const parts = await Promise.all(SITEMAP_SEGMENT_IDS.map((id) => buildSitemapSegmentEntries(id)));
  return parts.flat();
}
