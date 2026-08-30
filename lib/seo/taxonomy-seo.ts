import type { Metadata } from "next";

import { catalogHasDeepFilters, type StoryCatalogFilterParams } from "@/lib/discovery/catalog-url";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { resolveStoredMediaUrl } from "@/lib/media/media-resolver";
import { taxonomyLandingPath, taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyTerm, TaxonomyTermRow, TaxonomyType } from "@/types/taxonomy";

/** Default minimum published stories to allow index (admin can override per term). */
export const TAXONOMY_MIN_STORIES_FOR_INDEX = 3;

export const TAXONOMY_SITEMAP_DEFAULT_PRIORITY = 0.6;
export const TAXONOMY_SITEMAP_DEFAULT_CHANGEFREQ = "weekly";

/** Types excluded from public sitemap by default (sensitive / filter-only). */
export const TAXONOMY_SITEMAP_EXCLUDED_TYPES: TaxonomyType[] = [
  "content_warning",
  "editorial_tag"
];

export type TaxonomySeoFields = Pick<
  TaxonomyTermRow,
  | "seo_title"
  | "seo_description"
  | "seo_h1"
  | "seo_intro"
  | "canonical_path"
  | "seo_indexable"
  | "sitemap_priority"
  | "sitemap_changefreq"
  | "og_image_url"
  | "use_for_pinterest_feed"
  | "min_stories_override"
>;

export function resolveTaxonomyCanonicalPath(term: TaxonomyTerm): string | null {
  const override = term.canonical_path?.trim();
  if (override) {
    return override.startsWith("/") ? override : `/${override}`;
  }
  return taxonomyLandingPath(term.type, term.slug);
}

export function getTaxonomySeoTitle(term: Pick<TaxonomyTerm, "name" | "seo_title">): string {
  const custom = term.seo_title?.trim();
  if (custom) return custom;
  return `Truyện ${term.name} hay mới nhất trên ChapMee`;
}

export function getTaxonomySeoDescription(
  term: Pick<TaxonomyTerm, "name" | "seo_description" | "description">
): string {
  const custom = term.seo_description?.trim();
  if (custom) return custom;
  const desc = term.description?.trim();
  if (desc) return desc;
  return `Khám phá các truyện ${term.name} đang được cập nhật trên ChapMee — đọc miễn phí hoặc mở khóa chương VIP.`;
}

export function getTaxonomyH1(term: Pick<TaxonomyTerm, "name" | "seo_h1">): string {
  const custom = term.seo_h1?.trim();
  if (custom) return custom;
  return `Truyện ${term.name}`;
}

export function getTaxonomyIntro(
  term: Pick<TaxonomyTerm, "name" | "seo_intro" | "description">
): string {
  const intro = term.seo_intro?.trim();
  if (intro) return intro;
  const desc = term.description?.trim();
  if (desc) return desc;
  return `Danh sách truyện gắn nhãn "${term.name}" trên ChapMee.`;
}

export function rebuildTaxonomyCanonicalPath(term: TaxonomyTerm): string | null {
  return taxonomyTermPublicUrl(term.type, term.slug, term.is_public);
}

export function isTaxonomyEligibleForPublicLanding(term: TaxonomyTerm): boolean {
  return term.is_active && term.is_public;
}

export function isTaxonomySeoIndexable(
  term: TaxonomyTerm,
  publishedStoryCount: number
): boolean {
  if (!isTaxonomyEligibleForPublicLanding(term)) return false;
  if (!term.use_for_seo) return false;
  if (!term.seo_indexable) return false;

  const minRequired =
    term.min_stories_override != null && term.min_stories_override >= 0
      ? term.min_stories_override
      : TAXONOMY_MIN_STORIES_FOR_INDEX;

  if (publishedStoryCount < minRequired) return false;
  return true;
}

export function taxonomyLandingShouldNoindex(
  term: TaxonomyTerm,
  filters: StoryCatalogFilterParams,
  publishedStoryCount: number
): boolean {
  if (!isTaxonomySeoIndexable(term, publishedStoryCount)) return true;
  if ((filters.page ?? 1) > 1) return true;
  if (catalogHasDeepFilters(filters)) return true;
  if (filters.sort && filters.sort !== "updated") return true;
  return false;
}

export function isTaxonomyPinterestEligible(
  term: TaxonomyTerm,
  publishedStoryCount: number
): boolean {
  if (!isTaxonomySeoIndexable(term, publishedStoryCount)) return false;
  if (term.use_for_pinterest_feed) return true;
  return term.use_for_seo && term.use_for_discover;
}

export function buildTaxonomyLandingPageMetadata(input: {
  term: TaxonomyTerm;
  canonicalPath: string;
  filters: StoryCatalogFilterParams;
  publishedStoryCount: number;
  notFoundTitle?: string;
}): Metadata {
  const { term, canonicalPath, filters, publishedStoryCount } = input;
  const noindex = taxonomyLandingShouldNoindex(term, filters, publishedStoryCount);
  const title = getTaxonomySeoTitle(term);
  const description = getTaxonomySeoDescription(term);
  const canonical = buildCanonicalUrl(canonicalPath);
  const ogImage = resolveStoredMediaUrl(term.og_image_url ?? null);

  return {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      ...(canonical ? { url: canonical } : {}),
      ...(ogImage ? { images: [{ url: ogImage }] } : {})
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {})
    }
  };
}

export function buildTaxonomyNotFoundMetadata(notFoundTitle: string): Metadata {
  return { title: notFoundTitle, robots: { index: false, follow: false } };
}

export type TaxonomySitemapEntry = {
  pathname: string;
  lastModified?: string;
  priority: number;
  changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
};

export function mapTaxonomySitemapChangefreq(
  value: string | null | undefined
): TaxonomySitemapEntry["changeFrequency"] {
  const allowed: TaxonomySitemapEntry["changeFrequency"][] = [
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never"
  ];
  const normalized = value?.trim().toLowerCase() as TaxonomySitemapEntry["changeFrequency"];
  if (normalized && allowed.includes(normalized)) return normalized;
  return TAXONOMY_SITEMAP_DEFAULT_CHANGEFREQ;
}

export function mapTaxonomySitemapPriority(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) {
    return TAXONOMY_SITEMAP_DEFAULT_PRIORITY;
  }
  return Math.min(1, Math.max(0, Number(value)));
}
