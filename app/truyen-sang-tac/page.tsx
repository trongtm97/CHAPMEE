import type { Metadata } from "next";
import { StoryCatalogPage } from "@/components/stories/StoryCatalogPage";
import { ErrorState } from "@/components/ui";
import { catalogHasDeepFilters, parseCatalogSearchParams } from "@/lib/discovery/catalog-url";
import { getCatalogFilterOptionsCached } from "@/lib/discovery/catalog-filter-options-cached";
import { getPublicStoriesCatalogCached } from "@/lib/stories/getPublicStoriesCatalogCached";
import { clampPage, clampPageSize, DEFAULT_CATALOG_PAGE_SIZE } from "@/lib/stories/story-catalog-query";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";
import { OriginalStoriesCatalogChrome } from "@/components/catalog/OriginalStoriesCatalogChrome";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<Record<string, string | undefined>>;
};

function resolveCatalogPageSize(requestedPageSize: string | undefined) {
  return requestedPageSize ? clampPageSize(Number(requestedPageSize)) : DEFAULT_CATALOG_PAGE_SIZE;
}

export async function generateMetadata({
  searchParams
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);
  const deepFilters = catalogHasDeepFilters(filters);
  return metadataForStaticRoute({
    path: "/truyen-sang-tac",
    pageType: "story_catalog",
    fallbackTitle: "Truyện Sáng Tác | ChapMee",
    fallbackDescription: "Tác phẩm do tác giả ChapMee sáng tác.",
    indexableOverride: deepFilters ? false : null,
    followOverride: true
  });
}

export default async function OriginalsStoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseCatalogSearchParams(params);
  const page = clampPage(filters.page ?? 1);
  const pageSize = resolveCatalogPageSize(
    filters.pageSize ? String(filters.pageSize) : undefined
  );

  try {
    const [data, filterOptions] = await Promise.all([
      getPublicStoriesCatalogCached({
        ...filters,
        contentOrigin: "original",
        page,
        pageSize
      }),
      getCatalogFilterOptionsCached()
    ]);

    return (
      <OriginalStoriesCatalogChrome storyCount={data.totalCount}>
        <StoryCatalogPage {...data} filterOptions={filterOptions} hideCatalogHeader />
      </OriginalStoriesCatalogChrome>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh mục truyện sáng tác.";
    return (
      <section className="mx-auto max-w-lg px-4 py-10">
        <ErrorState message={message} title="Không tải được Truyện Sáng Tác" variant="danger" />
      </section>
    );
  }
}
