import type { MetadataRoute } from "next";

import { buildAllPublicSitemapEntries } from "@/lib/seo/sitemap-builders";

/** Full merged sitemap (admin stats, legacy callers). */
export async function buildPublicSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  return buildAllPublicSitemapEntries();
}

export {
  buildAllPublicSitemapEntries,
  buildAuthorSitemapEntries,
  buildChapterSitemapEntries,
  buildPoliciesSitemapEntries,
  buildPostsSitemapEntries,
  buildReelsSitemapEntries,
  buildSitemapSegmentEntries,
  buildStaticSitemapEntries,
  buildStorySitemapEntries,
  buildTaxonomySitemapEntries,
  isBlockedSitemapPathname,
  toSitemapEntry
} from "@/lib/seo/sitemap-builders";
