import type { Metadata } from "next";
import { ResponsivePageContainer } from "@/components/layout/ResponsivePageContainer";
import { ContentPostCatalogClient } from "@/components/content-posts/ContentPostCatalogClient";
import { buildSeoMetadata } from "@/lib/platform-content";
import {
  parsePublicPostListParams,
  resolvePublicPostFilters
} from "@/lib/content-posts/public-catalog";
import { listContentPosts } from "@/lib/platform-content/content-posts";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PAGE_SIZE = 20;

export default async function ContentPostsIndexPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const { page, q, category, sort } = parsePublicPostListParams(params);
  const filters = resolvePublicPostFilters(category);

  const [listResult, featuredResult, recentResult] = await Promise.all([
    listContentPosts({
      publicOnly: true,
      page,
      pageSize: PAGE_SIZE,
      search: q || undefined,
      sort,
      ...filters
    }),
    listContentPosts({
      publicOnly: true,
      limit: 3,
      sort: "views"
    }),
    listContentPosts({
      publicOnly: true,
      limit: 5,
      sort: "published"
    })
  ]);

  const { items, total, error } = listResult;

  return (
    <ResponsivePageContainer className="py-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bài viết</h1>
          <p className="text-muted-foreground">
            Hướng dẫn, tin nền tảng và mẹo đọc truyện từ ChapMee.
          </p>
        </header>

        {error ? (
          <p className="text-sm text-red-300">Không thể tải danh sách bài viết.</p>
        ) : (
          <ContentPostCatalogClient
            category={category}
            featured={featuredResult.items}
            items={items}
            page={page}
            pageSize={PAGE_SIZE}
            query={q}
            sidebarRecent={recentResult.items}
            sort={sort}
            total={total}
          />
        )}
      </div>
    </ResponsivePageContainer>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  return buildSeoMetadata({
    pathname: "/bai-viet",
    pageType: "content_post_catalog",
    title: "Bài viết ChapMee",
    description: "Hướng dẫn, tin nền tảng và mẹo đọc truyện từ ChapMee."
  });
}
