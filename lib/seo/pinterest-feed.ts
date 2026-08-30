import {
  loadCurrentStoryImagesByStoryIds,
  resolveStoryImageUrl
} from "@/lib/images/get-current-story-image";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { resolveContentPostOgImageUrl } from "@/lib/platform-content/resolve-content-post-media";
import { resolveTaxonomyOgImageUrl } from "@/lib/taxonomy/resolve-taxonomy-media";
import {
  getTaxonomySeoDescription,
  getTaxonomySeoTitle,
  isTaxonomyPinterestEligible,
  resolveTaxonomyCanonicalPath
} from "@/lib/seo/taxonomy-seo";
import { createPublicClient } from "@/lib/data/public-client";
import { createClient } from "@/lib/data/server";
import { publicContentStatuses } from "@/lib/visibility/contentVisibility";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { getStoryUrl } from "@/lib/seo/canonical";
import { getContentPostUrl } from "@/lib/urls/paths";
import {
  isContentPostPubliclyVisible,
  listContentPosts
} from "@/lib/platform-content/content-posts";
import type { TaxonomyTerm } from "@/types/taxonomy";

export type PinterestFeedItem = {
  title: string;
  description: string;
  link: string;
  imageLink: string | null;
  category: string | null;
  tags: string[];
  availability: "in stock";
};

const UUID_PATH = /\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(\/|$)/i;

function isCanonicalStoryPath(pathname: string): boolean {
  if (!pathname.startsWith("/truyen/")) return false;
  if (UUID_PATH.test(pathname)) return false;
  return pathname.includes("-s.");
}

function dedupeByLink(items: PinterestFeedItem[]): PinterestFeedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

/** Stories (truyện) feed items — canonical /truyen URLs only. */
export async function buildStoryPinterestFeedItems(): Promise<PinterestFeedItem[]> {
  const db = createPublicClient();
  const items: PinterestFeedItem[] = [];

  const { data: stories } = await db
    .from("stories")
    .select(
      "id, title, slug, public_code, hook, short_description, cover_url, updated_at, visibility, status"
    )
    .eq("visibility", "public")
    .in("status", [...publicContentStatuses])
    .not("public_code", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  const storyIds = (stories ?? []).map((row) => String(row.id));
  const storyImagesById = await loadCurrentStoryImagesByStoryIds(db, storyIds);

  const taxonomyByStory = new Map<
    string,
    { mainGenre: string | null; tags: string[] }
  >();

  if (storyIds.length > 0) {
    const { data: links } = await db
      .from("story_taxonomy_terms")
      .select("story_id, taxonomy_terms(type, name, slug, is_active, is_public)")
      .in("story_id", storyIds);

    for (const link of links ?? []) {
      const storyId = String(link.story_id);
      const raw = link.taxonomy_terms;
      const term = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;
      if (!term || !term.is_active || !term.is_public) continue;

      const bucket = taxonomyByStory.get(storyId) ?? { mainGenre: null, tags: [] };
      const type = String(term.type);
      const name = String(term.name);
      if (type === "main_genre" && !bucket.mainGenre) {
        bucket.mainGenre = name;
      }
      if (type === "trope_tag" || type === "subgenre" || type === "setting_tag") {
        bucket.tags.push(name);
      }
      taxonomyByStory.set(storyId, bucket);
    }
  }

  for (const story of stories ?? []) {
    if (!story.public_code || !story.slug) continue;
    const pathname = getStoryUrl({
      slug: String(story.slug),
      public_code: String(story.public_code)
    });
    if (!isCanonicalStoryPath(pathname)) continue;

    const link = buildCanonicalUrl(pathname);
    if (!link) continue;

    const tax = taxonomyByStory.get(String(story.id));
    const summary = [story.hook, story.short_description]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const description =
      summary.length > 20
        ? summary.slice(0, 500)
        : `Đọc truyện ${story.title} trên ChapMee.`;

    items.push({
      title: String(story.title),
      description,
      link,
      imageLink: resolveStoryImageUrl({
        image: storyImagesById.get(String(story.id)) ?? null,
        variant: "landscape",
        coverUrl: story.cover_url ? String(story.cover_url) : null
      }),
      category: tax?.mainGenre ?? null,
      tags: tax?.tags.slice(0, 5) ?? [],
      availability: "in stock"
    });
  }

  return dedupeByLink(items);
}

/** Taxonomy hub feed items (genres / tags flagged for Pinterest). */
export async function buildTaxonomyPinterestFeedItems(): Promise<PinterestFeedItem[]> {
  const db = await createClient();
  const items: PinterestFeedItem[] = [];

  const { data: pinterestTerms } = await db
    .from("taxonomy_terms")
    .select("*")
    .eq("is_active", true)
    .eq("is_public", true)
    .eq("use_for_pinterest_feed", true)
    .limit(200);

  for (const row of pinterestTerms ?? []) {
    const term = mapTaxonomyTermRow(row as Record<string, unknown>) as TaxonomyTerm;
    if (!isTaxonomyPinterestEligible(term, term.usage_count)) continue;

    const pathname = resolveTaxonomyCanonicalPath(term);
    if (!pathname || pathname.includes("?")) continue;

    const link = buildCanonicalUrl(pathname);
    if (!link) continue;

    items.push({
      title: getTaxonomySeoTitle(term),
      description: getTaxonomySeoDescription(term),
      link,
      imageLink: await resolveTaxonomyOgImageUrl(term),
      category: term.type === "main_genre" ? term.name : null,
      tags: [term.name],
      availability: "in stock"
    });
  }

  return dedupeByLink(items);
}

/** Articles (bài viết) feed items — public, indexable content posts. */
export async function buildContentPostPinterestFeedItems(): Promise<PinterestFeedItem[]> {
  const { items: posts } = await listContentPosts({ publicOnly: true, limit: 500 });
  const items: PinterestFeedItem[] = [];

  for (const post of posts) {
    if (!isContentPostPubliclyVisible(post)) continue;
    if (!post.indexable) continue;
    if (!post.public_code) continue;

    const pathname = getContentPostUrl({
      slug: post.slug,
      public_code: post.public_code
    });
    const link = buildCanonicalUrl(pathname);
    if (!link) continue;

    const summary = String(post.excerpt ?? post.seo_description ?? "").trim();
    const description =
      summary.length > 20 ? summary.slice(0, 500) : `Đọc bài viết ${post.title} trên ChapMee.`;

    const imageLink = await resolveContentPostOgImageUrl(post);

    items.push({
      title: post.title,
      description,
      link,
      imageLink,
      category: post.category ?? null,
      tags: (post.tags ?? []).slice(0, 5),
      availability: "in stock"
    });
  }

  return dedupeByLink(items);
}

/** Combined feed: stories + articles + taxonomy hubs. */
export async function buildPinterestFeedItems(): Promise<PinterestFeedItem[]> {
  const [stories, posts, taxonomy] = await Promise.all([
    buildStoryPinterestFeedItems(),
    buildContentPostPinterestFeedItems(),
    buildTaxonomyPinterestFeedItems()
  ]);

  return dedupeByLink([...stories, ...posts, ...taxonomy]);
}
