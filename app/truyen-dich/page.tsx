import type { Metadata } from "next";
import { StoryCatalogPage } from "@/components/stories/StoryCatalogPage";
import { ErrorState } from "@/components/ui";
import { catalogHasDeepFilters, parseCatalogSearchParams } from "@/lib/discovery/catalog-url";
import { getCatalogFilterOptionsCached } from "@/lib/discovery/catalog-filter-options-cached";
import { getPublicStoriesCatalogCached } from "@/lib/stories/getPublicStoriesCatalogCached";
import { clampPage, clampPageSize, DEFAULT_CATALOG_PAGE_SIZE } from "@/lib/stories/story-catalog-query";
import { metadataForStaticRoute } from "@/lib/seo/public-page-metadata";
import Link from "next/link";

const TRANSLATION_ALLOWED_SORTS = [
  "updated",
  "new",
  "hot",
  "reads",
  "saved",
  "chapters",
  "completed",
  "title",
  "quick"
] as const;

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
    path: "/truyen-dich",
    pageType: "story_catalog",
    fallbackTitle: "Truyện Dịch | ChapMee",
    fallbackDescription: "Truyện dịch/chuyển ngữ, đọc miễn phí theo chính sách ChapMee.",
    indexableOverride: deepFilters ? false : null,
    followOverride: true
  });
}

export default async function TranslationStoriesPage({ searchParams }: PageProps) {
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
        contentOrigin: "translation",
        page,
        pageSize
      }),
      getCatalogFilterOptionsCached()
    ]);
    const translationFilterOptions = {
      ...filterOptions,
      monetizationAccess: []
    };

    return (
      <section className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-black text-white">Truyện Dịch</h1>
          <p className="text-sm text-zinc-400">
            Truyện dịch/chuyển ngữ, đọc miễn phí theo chính sách ChapMee.
          </p>
        </header>
        <QuickSections
          items={[
            { label: "Mới cập nhật", href: "/truyen-dich?sort=updated" },
            { label: "Đọc nhiều", href: "/truyen-dich?sort=reads" },
            { label: "Theo ngôn ngữ gốc", href: "/truyen-dich" },
            { label: "Theo thể loại", href: "/truyen-dich" }
          ]}
        />
        <StoryCatalogPage
          {...data}
          allowedSorts={[...TRANSLATION_ALLOWED_SORTS]}
          filterOptions={translationFilterOptions}
          hideAccessFilters
          hideCatalogHeader
          hideMonetizationFilters
        />
      </section>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể tải danh mục truyện dịch.";
    return (
      <section className="mx-auto max-w-lg px-4 py-10">
        <ErrorState message={message} title="Không tải được Truyện Dịch" variant="danger" />
      </section>
    );
  }
}

function QuickSections({
  items
}: {
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/15"
          href={item.href}
          key={item.label}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
