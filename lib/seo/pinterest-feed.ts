import { buildCanonicalUrl, resolvePublicUrl } from "@/lib/seo/metadata";
import {
  getTaxonomySeoDescription,
  getTaxonomySeoTitle,
  isTaxonomyPinterestEligible,
  resolveTaxonomyCanonicalPath
} from "@/lib/seo/taxonomy-seo";
import { createClient } from "@/lib/supabase/server";
import { mapTaxonomyTermRow } from "@/lib/taxonomy/map-row";
import { getStoryUrl } from "@/lib/seo/canonical";
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

export async function buildPinterestFeedItems(): Promise<PinterestFeedItem[]> {
  const supabase = await createClient();
  const items: PinterestFeedItem[] = [];

  const { data: stories } = await supabase
    .from("stories")
    .select(
      "id, title, slug, public_code, synopsis, cover_url, updated_at, visibility, status"
    )
    .eq("visibility", "public")
    .in("status", ["published", "approved"])
    .not("public_code", "is", null)
    .order("updated_at", { ascending: false })
    .limit(500);

  const storyIds = (stories ?? []).map((row) => String(row.id));

  const taxonomyByStory = new Map<
    string,
    { mainGenre: string | null; tags: string[] }
  >();

  if (storyIds.length > 0) {
    const { data: links } = await supabase
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
    const synopsis = String(story.synopsis ?? "").trim();
    const description =
      synopsis.length > 20
        ? synopsis.slice(0, 500)
        : `Đọc truyện ${story.title} trên ChapMee.`;

    items.push({
      title: String(story.title),
      description,
      link,
      imageLink: resolvePublicUrl(story.cover_url ? String(story.cover_url) : null),
      category: tax?.mainGenre ?? null,
      tags: tax?.tags.slice(0, 5) ?? [],
      availability: "in stock"
    });
  }

  const { data: pinterestTerms } = await supabase
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
      imageLink: resolvePublicUrl(term.og_image_url),
      category: term.type === "main_genre" ? term.name : null,
      tags: [term.name],
      availability: "in stock"
    });
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}
