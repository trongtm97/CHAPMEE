/**
 * Central canonical URL builders for SEO surfaces (sitemap, metadata, feeds).
 * Path helpers are imported from urls/paths first to avoid circular init with taxonomy-seo.
 */

import {
  generateCanonicalPath,
  getAnnouncementUrl,
  getCanonicalUrl,
  getChapterUrl,
  getContentPostUrl,
  getPolicyUrl,
  getProfileUrl,
  getReelUrl,
  getStoryUrl
} from "@/lib/urls/paths";
import { resolveTaxonomyCanonicalPath } from "@/lib/seo/taxonomy-seo";
import { taxonomyTermPublicUrl } from "@/lib/taxonomy/public-url";
import type { TaxonomyTerm, TaxonomyType } from "@/types/taxonomy";

export {
  generateCanonicalPath,
  getAnnouncementUrl,
  getCanonicalUrl,
  getChapterUrl,
  getContentPostUrl,
  getPolicyUrl,
  getProfileUrl,
  getReelUrl,
  getStoryUrl
};

export function getTaxonomyUrl(
  term: Pick<TaxonomyTerm, "type" | "slug" | "is_public" | "canonical_path"> &
    Partial<Pick<TaxonomyTerm, "name">>
): string | null {
  const fromOverride = resolveTaxonomyCanonicalPath(term as TaxonomyTerm);
  if (fromOverride) return fromOverride;
  return taxonomyTermPublicUrl(term.type, term.slug, term.is_public ?? true);
}

export function getTaxonomyUrlByType(type: TaxonomyType, slug: string, isPublic = true) {
  return taxonomyTermPublicUrl(type, slug, isPublic);
}
