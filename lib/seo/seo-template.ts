import type { SeoPageType } from "@/lib/seo/seo-constants";
import { DEFAULT_SEO_METADATA_TEMPLATES } from "@/lib/seo/default-metadata-templates";
import type { SeoTemplateVariables } from "@/lib/seo/interpolate-seo-template";
import {
  interpolateSeoTemplate,
  warnSeoDescriptionLength,
  warnSeoTitleLength
} from "@/lib/seo/interpolate-seo-template";
import type { SeoMetadataTemplate } from "@/types/admin-seo";

export type { SeoTemplateVariables };
export { interpolateSeoTemplate, warnSeoDescriptionLength, warnSeoTitleLength };

/** Maps App Router page types to seo_metadata_templates.page_type keys. */
export const SEO_PAGE_TYPE_TO_TEMPLATE_KEY: Record<SeoPageType, string> = {
  home: "reels",
  discover: "discover",
  story_catalog: "discover",
  story_detail: "story",
  chapter: "chapter",
  profile: "author",
  taxonomy: "discover",
  media: "discover",
  article: "content_post",
  ranking: "discover",
  community: "discover",
  content_post: "content_post",
  policy: "content_post",
  announcement: "content_post",
  reels: "reels",
  static: "discover"
};

function defaultTemplatesByPageType(): Map<string, SeoMetadataTemplate> {
  const map = new Map<string, SeoMetadataTemplate>();
  for (const item of DEFAULT_SEO_METADATA_TEMPLATES) {
    map.set(item.page_type, {
      ...item,
      id: `default-${item.page_type}`,
      updated_at: new Date(0).toISOString()
    });
  }
  return map;
}

const defaultTemplateMap = defaultTemplatesByPageType();

export function getDefaultSeoTemplate(pageType: SeoPageType | string | undefined): SeoMetadataTemplate | null {
  if (!pageType) {
    return null;
  }
  const key =
    pageType in SEO_PAGE_TYPE_TO_TEMPLATE_KEY
      ? SEO_PAGE_TYPE_TO_TEMPLATE_KEY[pageType as SeoPageType]
      : String(pageType);
  return defaultTemplateMap.get(key) ?? null;
}

export async function getSeoTemplateForPageType(
  pageType: SeoPageType | string | undefined
): Promise<SeoMetadataTemplate | null> {
  if (!pageType) {
    return null;
  }

  const templateKey =
    pageType in SEO_PAGE_TYPE_TO_TEMPLATE_KEY
      ? SEO_PAGE_TYPE_TO_TEMPLATE_KEY[pageType as SeoPageType]
      : String(pageType);

  try {
    const { listSeoMetadataTemplates } = await import("@/lib/seo/metadata-templates-store");
    const { items } = await listSeoMetadataTemplates();
    const match = items.find((item) => item.page_type === templateKey && item.is_active);
    if (match) {
      return match;
    }
  } catch {
    // Fall back to in-memory defaults.
  }

  return defaultTemplateMap.get(templateKey) ?? null;
}

export function buildTemplateVariables(input: {
  siteName: string;
  entity?: import("@/lib/seo/seo-types").SeoEntityData | null;
  fallbackTitle?: string | null;
  fallbackDescription?: string | null;
}): SeoTemplateVariables {
  const entity = input.entity ?? {};
  const pageTitle =
    input.fallbackTitle?.trim() ||
    entity.storyTitle?.trim() ||
    entity.postTitle?.trim() ||
    entity.taxonomyName?.trim() ||
    entity.pageTitle?.trim() ||
    "";

  return {
    site_name: input.siteName,
    page_title: pageTitle,
    story_title: entity.storyTitle ?? null,
    chapter_title: entity.chapterTitle ?? null,
    author_name: entity.authorName ?? null,
    username: entity.username ?? null,
    genre: entity.genre ?? null,
    genres: entity.genres ?? null,
    genre_name: entity.genre ?? null,
    category_name: entity.genre ?? entity.taxonomyName ?? null,
    chapter_count: entity.chapterCount ?? null,
    chapter_number: entity.chapterNumber ?? null,
    status: entity.status ?? entity.contentStatus ?? null,
    year: entity.year ?? new Date().getFullYear(),
    current_year: entity.year ?? new Date().getFullYear(),
    page: entity.page ?? null,
    taxonomy_name: entity.taxonomyName ?? null,
    post_title: entity.postTitle ?? pageTitle,
    post_excerpt: entity.excerpt ?? entity.shortDescription ?? input.fallbackDescription ?? null,
    short_description: entity.shortDescription ?? entity.excerpt ?? input.fallbackDescription ?? null,
    announcement_title: entity.postTitle ?? null,
    reels_title: entity.pageTitle ?? pageTitle
  };
}
