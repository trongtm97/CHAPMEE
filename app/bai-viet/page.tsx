import type { Metadata } from "next";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { buildContentHubCollectionJsonLd } from "@/lib/seo/structured-data";
import { buildCanonicalUrl } from "@/lib/seo/metadata";
import { ContentPostCatalogClient } from "@/components/content-posts/ContentPostCatalogClient";
import { ContentPostHero } from "@/components/content-posts/ContentPostHero";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";
import {
  PUBLIC_CONTENT_HUB_PAGE_SIZE,
  parsePublicPostListParams
} from "@/lib/content-posts/public-catalog";
import {
  excludePostsFromList,
  fetchPublicContentHubFeatured,
  fetchPublicContentHubList,
  pickFeaturedForHero
} from "@/lib/content-posts/public-list";
import { listContentPostCategories } from "@/lib/platform-content/content-post-categories";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 60;

export default async function ContentPostsIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { page, q, category, sort } = parsePublicPostListParams(params);
  const hasActiveFilters = Boolean(q) || category !== "all" || sort !== "published";

  const [listResult, featuredPosts, dynamicCategoriesResult] = await Promise.all([
    fetchPublicContentHubList({ page, q, category, sort }),
    fetchPublicContentHubFeatured(),
    listContentPostCategories()
  ]);

  const { primary, secondary } = pickFeaturedForHero(featuredPosts);
  const featuredIds = [primary, ...secondary].filter((p): p is NonNullable<typeof primary> =>
    Boolean(p)
  );
  const items =
    page === 1 && !q && category === "all"
      ? excludePostsFromList(listResult.items, featuredIds)
      : listResult.items;

  const showUpdatingEmpty =
    !listResult.usingDevFallback && listResult.total === 0 && !listResult.error && !hasActiveFilters;

  const collectionJsonLd = buildContentHubCollectionJsonLd({
    url: buildCanonicalUrl("/bai-viet") ?? undefined
  });

  return (
    <ResponsivePageContainer className="py-6 md:py-8">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
        type="application/ld+json"
      />
      <div className="space-y-5 md:space-y-6">
        <ContentPostHero />

        {listResult.error ? (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Không thể tải danh sách bài viết. Vui lòng thử lại sau.
          </p>
        ) : (
          <ContentPostCatalogClient
            category={category}
            dynamicCategories={dynamicCategoriesResult.items}
            featuredPrimary={hasActiveFilters || page > 1 ? null : primary}
            featuredSecondary={hasActiveFilters || page > 1 ? [] : secondary}
            hasActiveFilters={hasActiveFilters}
            items={items}
            page={page}
            pageSize={PUBLIC_CONTENT_HUB_PAGE_SIZE}
            query={q}
            showUpdatingEmpty={showUpdatingEmpty}
            sort={sort}
            total={listResult.total}
          />
        )}
      </div>
    </ResponsivePageContainer>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return metadataForStaticRoute({
    path: "/bai-viet",
    pageType: "article",
    fallbackTitle: "Bài viết ChapMee - Hướng dẫn, cập nhật và mẹo đọc truyện",
    fallbackDescription:
      "Tổng hợp hướng dẫn, tin nền tảng, mẹo đọc truyện và kinh nghiệm dành cho người đọc, tác giả trên ChapMee."
  });
}
