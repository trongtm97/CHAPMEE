import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { countSitemapSegmentUrls } from "@/lib/seo/sitemap-counts";
import {
  encodeSitemapChildId,
  normalizeUrlsPerPage,
  pageCountForUrls,
  parseSitemapChildId,
  segmentUsesPagination,
  type SitemapChildRef
} from "@/lib/seo/sitemap-pagination";
import type { SitemapSegmentId } from "@/lib/seo/sitemap-segments";
import {
  getEnabledSitemapSegmentIds,
  getSeoSitemapSettings,
  type SeoSitemapSettings
} from "@/lib/seo/sitemap-service";

export type SitemapChildDescriptor = SitemapChildRef & {
  url: string | null;
  estimatedUrlCount: number;
};

export async function listSitemapChildDescriptors(
  settings?: SeoSitemapSettings,
  urlsPerPage?: number
): Promise<SitemapChildDescriptor[]> {
  const resolved = settings ?? (await getSeoSitemapSettings());
  const perPage = normalizeUrlsPerPage(urlsPerPage);
  const segments = getEnabledSitemapSegmentIds(resolved);
  const descriptors: SitemapChildDescriptor[] = [];

  for (const segment of segments) {
    const total = await countSitemapSegmentUrls(segment, resolved);
    const pages = segmentUsesPagination(segment)
      ? pageCountForUrls(total, perPage)
      : total > 0
        ? 1
        : 0;

    for (let page = 1; page <= pages; page += 1) {
      const id = encodeSitemapChildId(segment, page);
      const path = `/sitemap/${id}.xml`;
      const pageStart = (page - 1) * perPage;
      const remaining = Math.max(0, total - pageStart);
      const estimatedUrlCount = segmentUsesPagination(segment)
        ? Math.min(perPage, remaining)
        : total;

      descriptors.push({
        estimatedUrlCount,
        id,
        page,
        path,
        segment,
        url: buildCanonicalUrl(path) ?? null
      });
    }
  }

  return descriptors;
}

export function resolveSitemapChildFromId(
  childId: string,
  settings: SeoSitemapSettings
): SitemapChildRef | null {
  const parsed = parseSitemapChildId(childId);
  if (!parsed) {
    return null;
  }
  if (!getEnabledSitemapSegmentIds(settings).includes(parsed.segment)) {
    return null;
  }
  return parsed;
}

export function segmentLabel(segment: SitemapSegmentId): string {
  const labels: Record<SitemapSegmentId, string> = {
    authors: "Tác giả",
    chapters: "Chương truyện",
    media: "Media",
    policies: "Chính sách",
    posts: "Bài viết & thông báo",
    reels: "Reels",
    static: "Trang tĩnh",
    stories: "Truyện",
    taxonomy: "Taxonomy"
  };
  return labels[segment];
}
