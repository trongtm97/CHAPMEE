import type { Metadata } from "next";
import { headers } from "next/headers";
import { StoryCatalogPage } from "@/components/stories/StoryCatalogPage";
import { getPublicStoriesCatalogCached } from "@/lib/stories/getPublicStoriesCatalogCached";
import {
  DEFAULT_CATALOG_PAGE_SIZE,
  DESKTOP_CATALOG_PAGE_SIZE,
  clampPage,
  clampPageSize
} from "@/lib/stories/story-catalog-query";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import type { StoryCatalogSort, StoryCatalogStatus } from "@/types/story";

export const revalidate = 60;

type StoriesIndexPageProps = {
  searchParams: Promise<{
    q?: string;
    genre?: string;
    sort?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }>;
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

export async function generateMetadata(): Promise<Metadata> {
  const canonical = buildCanonicalUrl("/truyen");
  return {
    title: "Danh mục truyện ChapMee",
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
  const page = clampPage(Number(params.page ?? "1"));
  const sort = (params.sort ?? "updated") as StoryCatalogSort;
  const status = (params.status ?? "all") as StoryCatalogStatus;
  const pageSize = resolveCatalogPageSize(params.pageSize, userAgent);

  const data = await getPublicStoriesCatalogCached({
    q: params.q,
    genre: params.genre,
    sort,
    status,
    page,
    pageSize
  });

  return <StoryCatalogPage {...data} />;
}
