import type { MetadataRoute } from "next";

import { getTaxonomySitemapPaths } from "@/lib/discovery/sitemap-taxonomy";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { isLegacyProfilePath, isNoIndexPath } from "@/lib/seo/noindex-policy";
import type { SitemapChildRef } from "@/lib/seo/sitemap-pagination";
import {
  DEFAULT_SITEMAP_URLS_PER_PAGE,
  normalizeUrlsPerPage,
  paginationOffset,
  type SitemapPagination
} from "@/lib/seo/sitemap-pagination";
import { SITEMAP_SEGMENT_IDS, type SitemapSegmentId } from "@/lib/seo/sitemap-segments";
import {
  getEnabledSitemapSegmentIds,
  getSeoSitemapSettings,
  type SeoSitemapSettings
} from "@/lib/seo/sitemap-service";
import { createClient } from "@/lib/data/server";
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
    isLegacyProfilePath(pathname) ||
    isNoIndexPath(pathname)
  );
}

export function toSitemapEntry(
  pathname: string,
  lastModified?: Date | string | null,
  extra?: Pick<MetadataRoute.Sitemap[number], "priority" | "changeFrequency">,
  settings?: Pick<SeoSitemapSettings, "defaultChangefreq" | "defaultPriority">
): MetadataRoute.Sitemap[number] | null {
  if (isBlockedSitemapPathname(pathname)) return null;
  const url = buildCanonicalUrl(pathname);
  if (!url) return null;

  const entry: MetadataRoute.Sitemap[number] = { url };

  if (lastModified) {
    entry.lastModified = new Date(lastModified);
  }

  const changeFrequency = extra?.changeFrequency ?? settings?.defaultChangefreq ?? undefined;
  const priority = extra?.priority ?? settings?.defaultPriority ?? undefined;

  if (changeFrequency) {
    entry.changeFrequency = changeFrequency;
  }
  if (priority != null) {
    entry.priority = priority;
  }

  return entry;
}

const STATIC_PATHS = [
  "/",
  "/discover",
  "/media",
  "/reels",
  "/truyen",
  "/truyen-sang-tac",
  "/truyen-dich",
  "/bai-viet",
  "/chinh-sach",
  "/thong-bao",
  "/community",
  "/bang-xep-hang",
  "/about",
  "/contact",
  "/community-guidelines",
  "/kham-pha",
  "/tien-ich",
  "/tien-ich/icon",
  "/tien-ich/xoa-dau-tieng-viet",
  "/tien-ich/chuyen-so-tien-thanh-chu",
  "/tien-ich/dem-tu-ky-tu",
  "/tien-ich/chuyen-chu-hoa-thuong",
  "/tien-ich/tao-ma-qr-code",
  "/tien-ich/tinh-bmi",
  "/tien-ich/tinh-tdee",
  "/tien-ich/tinh-lai-suat",
  "/tien-ich/tinh-thue-vat",
  "/tien-ich/tinh-phan-tram",
  "/tien-ich/tinh-ngay-quan-he-an-toan",
  "/tien-ich/pomodoro"
];

export async function buildStaticSitemapEntries(
  settings?: SeoSitemapSettings
): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];
  for (const path of STATIC_PATHS) {
    const entry = toSitemapEntry(path, null, undefined, settings);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildMediaSitemapEntries(
  settings?: SeoSitemapSettings
): Promise<MetadataRoute.Sitemap> {
  const paths = ["/media", "/truyen-sang-tac", "/truyen-dich"];
  const entries: MetadataRoute.Sitemap = [];
  for (const path of paths) {
    const entry = toSitemapEntry(path, null, { changeFrequency: "daily" }, settings);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildStorySitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  let query = db
    .from("stories")
    .select("slug, public_code, updated_at")
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .not("public_code", "is", null)
    .order("updated_at", { ascending: false });

  if (pagination) {
    const { from, to } = paginationOffset(pagination);
    query = query.range(from, to);
  }

  const { data: stories } = await query;

  const entries: MetadataRoute.Sitemap = [];
  for (const story of stories ?? []) {
    const entry = toSitemapEntry(
      getStoryUrl({ slug: String(story.slug), public_code: String(story.public_code) }),
      story.updated_at,
      undefined,
      settings
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildChapterSitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  let query = db
    .from("episodes")
    .select(
      "id, slug, public_code, updated_at, stories!inner(slug, public_code, visibility, status, structure_type)"
    )
    .in("status", ["published", "approved"])
    .eq("stories.visibility", "public")
    .in("stories.status", ["published", "approved"])
    .not("public_code", "is", null)
    .neq("stories.structure_type", "standalone")
    .order("updated_at", { ascending: false });

  if (pagination) {
    const { from, to } = paginationOffset(pagination);
    query = query.range(from, to);
  }

  const { data: episodes } = await query;

  const episodeIds = (episodes ?? []).map((row) => String(row.id));
  const paidChapterIds = new Set<string>();

  if (episodeIds.length > 0) {
    const { data: monetization } = await db
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
      episode.updated_at,
      undefined,
      settings
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildTaxonomySitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const paths = await getTaxonomySitemapPaths();
  const slice = pagination
    ? paths.slice(
        paginationOffset(pagination).from,
        paginationOffset(pagination).to + 1
      )
    : paths;
  const entries: MetadataRoute.Sitemap = [];

  for (const path of slice) {
    const entry = toSitemapEntry(
      path.pathname,
      path.lastModified,
      {
        priority: path.priority,
        changeFrequency: path.changeFrequency
      },
      settings
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildAuthorSitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  let query = db
    .from("profiles")
    .select("username, updated_at")
    .not("username", "is", null)
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  if (pagination) {
    const { from, to } = paginationOffset(pagination);
    query = query.range(from, to);
  }

  const { data: authors } = await query;

  const entries: MetadataRoute.Sitemap = [];
  for (const author of authors ?? []) {
    const profileUrl = getProfileUrl(author.username);
    if (!profileUrl) continue;
    const entry = toSitemapEntry(profileUrl, author.updated_at, undefined, settings);
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildPostsSitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  const [{ data: contentPosts }, { data: announcements }, { data: postCategories }] = await Promise.all([
    db
      .from("admin_content_posts")
      .select("slug, public_code, updated_at")
      .eq("status", "published")
      .eq("indexable", true)
      .not("public_code", "is", null)
      .order("updated_at", { ascending: false }),
    db
      .from("platform_announcements")
      .select("slug, public_code, updated_at")
      .eq("status", "published")
      .eq("visibility", "public")
      .eq("indexable", true)
      .not("public_code", "is", null)
      .order("updated_at", { ascending: false }),
    db
      .from("content_post_categories")
      .select("slug, updated_at")
      .eq("status", "active")
      .eq("indexable", true)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
  ]);

  const combined = [
    ...(contentPosts ?? []).map((post) => ({
      kind: "post" as const,
      row: post,
      updatedAt: post.updated_at
    })),
    ...(announcements ?? []).map((announcement) => ({
      kind: "announcement" as const,
      row: announcement,
      updatedAt: announcement.updated_at
    })),
    ...(postCategories ?? []).map((category) => ({
      kind: "post_category" as const,
      row: category,
      updatedAt: category.updated_at
    }))
  ].sort((left, right) => {
    const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
    const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;
    return rightTime - leftTime;
  });

  const slice = pagination
    ? combined.slice(
        paginationOffset(pagination).from,
        paginationOffset(pagination).to + 1
      )
    : combined;

  const entries: MetadataRoute.Sitemap = [];

  for (const item of slice) {
    if (item.kind === "post") {
      const post = item.row;
    const entry = toSitemapEntry(
      getContentPostUrl({ slug: post.slug, public_code: post.public_code }),
      post.updated_at,
      undefined,
      settings
    );
      if (entry) entries.push(entry);
      continue;
    }

    if (item.kind === "post_category") {
      const category = item.row;
      const entry = toSitemapEntry(
        `/bai-viet/danh-muc/${String(category.slug)}`,
        category.updated_at,
        undefined,
        settings
      );
      if (entry) entries.push(entry);
      continue;
    }

    const announcement = item.row;
    const entry = toSitemapEntry(
      getAnnouncementUrl({
        slug: announcement.slug,
        public_code: announcement.public_code
      }),
      announcement.updated_at,
      undefined,
      settings
    );
    if (entry) entries.push(entry);
  }

  return entries;
}

export async function buildPoliciesSitemapEntries(
  settings?: SeoSitemapSettings
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  const { data: policies } = await db
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
      policy.updated_at,
      undefined,
      settings
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

export async function buildReelsSitemapEntries(
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  const db = await createClient();
  let query = db
    .from("reels_items")
    .select("slug, public_code, updated_at")
    .eq("status", "published")
    .not("public_code", "is", null)
    .order("updated_at", { ascending: false });

  if (pagination) {
    const { from, to } = paginationOffset(pagination);
    query = query.range(from, to);
  }

  const { data: reels } = await query;

  const entries: MetadataRoute.Sitemap = [];
  for (const reel of reels ?? []) {
    const entry = toSitemapEntry(
      getReelUrl({ slug: reel.slug, public_code: reel.public_code }),
      reel.updated_at,
      undefined,
      settings
    );
    if (entry) entries.push(entry);
  }
  return entries;
}

const SEGMENT_BUILDERS: Record<
  SitemapSegmentId,
  (
    settings?: SeoSitemapSettings,
    pagination?: SitemapPagination
  ) => Promise<MetadataRoute.Sitemap>
> = {
  static: buildStaticSitemapEntries,
  stories: buildStorySitemapEntries,
  chapters: buildChapterSitemapEntries,
  taxonomy: buildTaxonomySitemapEntries,
  authors: buildAuthorSitemapEntries,
  media: buildMediaSitemapEntries,
  posts: buildPostsSitemapEntries,
  policies: buildPoliciesSitemapEntries,
  reels: buildReelsSitemapEntries
};

export async function buildSitemapSegmentEntries(
  segmentId: SitemapSegmentId,
  settings?: SeoSitemapSettings,
  pagination?: SitemapPagination
): Promise<MetadataRoute.Sitemap> {
  return SEGMENT_BUILDERS[segmentId](settings, pagination);
}

export async function buildSitemapChildEntries(
  child: SitemapChildRef,
  settings?: SeoSitemapSettings,
  urlsPerPage: number = DEFAULT_SITEMAP_URLS_PER_PAGE
): Promise<MetadataRoute.Sitemap> {
  const perPage = normalizeUrlsPerPage(urlsPerPage);
  return buildSitemapSegmentEntries(child.segment, settings, {
    page: child.page,
    perPage
  });
}

export async function buildAllPublicSitemapEntries(
  settings?: SeoSitemapSettings
): Promise<MetadataRoute.Sitemap> {
  const s = settings ?? (await getSeoSitemapSettings());
  const ids = getEnabledSitemapSegmentIds(s);
  const parts = await Promise.all(ids.map((id) => buildSitemapSegmentEntries(id, s)));
  return parts.flat();
}
