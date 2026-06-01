import type { Metadata } from "next";
import { headers } from "next/headers";
import { StoryCatalogPage } from "@/components/stories/StoryCatalogPage";
import { catalogHasDeepFilters, parseCatalogSearchParams } from "@/lib/discovery/catalog-url";
import { getCatalogFilterOptionsCached } from "@/lib/discovery/catalog-filter-options-cached";
import { getPublicStoriesCatalogCached } from "@/lib/stories/getPublicStoriesCatalogCached";
import {
  DEFAULT_CATALOG_PAGE_SIZE,
  DESKTOP_CATALOG_PAGE_SIZE,
  clampPage,
  clampPageSize
} from "@/lib/stories/story-catalog-query";
import { buildCanonicalUrl } from "@/lib/seo/metadata";

export const revalidate = 60;

type StoriesIndexPageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function isMobileUserAgent(userAgent: string) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function resolveCatalogPageSize(requestedPageSize: string | undefined, userAgent: string) {
  if (requestedPageSize) {
    return clampPageSize(Number(requestedPageSize));
  }
  return isMobileUserAgent(userAgent) ? DEFAULT_CATALOG_PAGE_SIZE : DESKTOP_CATALOG_PAGE_SIZE;
}

export async function generateMetadata({
  searchParams
}: StoriesIndexPageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);
  const deepFilters = catalogHasDeepFilters(filters);
  const canonical = buildCanonicalUrl("/truyen");
  return {
    title: "Danh mục truyện ChapMee",
    robots: deepFilters ? { index: false, follow: true } : undefined,
    description:
      "Khám phá toàn bộ truyện ngắn, truyện chat, drama, ngôn tình, kinh dị và nhiều thể loại khác trên ChapMee.",
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: "Danh mục truyện ChapMee",
      description:
        "Khám phá toàn bộ truyện ngắn, truyện chat, drama, ngôn tình, kinh dị và nhiều thể loại khác trên ChapMee.",
      type: "website",
      ...(canonical ? { url: canonical } : {})
    },
    twitter: {
      card: "summary",
      title: "Danh mục truyện ChapMee",
      description:
        "Khám phá toàn bộ truyện ngắn, truyện chat, drama, ngôn tình, kinh dị và nhiều thể loại khác trên ChapMee."
    }
  };
}

export default async function StoriesIndexPage({ searchParams }: StoriesIndexPageProps) {
  const params = await searchParams;
  const headerStore = await headers();
  const userAgent = headerStore.get("user-agent") ?? "";
  const filters = parseCatalogSearchParams(params);
  const page = clampPage(filters.page ?? 1);
  const pageSize = resolveCatalogPageSize(
    filters.pageSize ? String(filters.pageSize) : undefined,
    userAgent
  );

  const [data, filterOptions] = await Promise.all([
    getPublicStoriesCatalogCached({
      ...filters,
      page,
      pageSize
    }),
    getCatalogFilterOptionsCached()
  ]);

  return <StoryCatalogPage {...data} filterOptions={filterOptions} />;
}
