import type { MetadataRoute } from "next";

import { buildSitemapSegmentEntries } from "@/lib/seo/sitemap-builders";
import { SITEMAP_SEGMENT_IDS, isSitemapSegmentId } from "@/lib/seo/sitemap-segments";

export async function generateSitemaps() {
  return SITEMAP_SEGMENT_IDS.map((id) => ({ id }));
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  if (!isSitemapSegmentId(id)) {
    return [];
  }
  return buildSitemapSegmentEntries(id);
}
