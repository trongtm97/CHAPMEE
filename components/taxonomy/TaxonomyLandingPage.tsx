import Link from "next/link";
import { TaxonomyPageViewTracker } from "@/components/analytics/TaxonomyPageViewTracker";
import { TaxonomyFilterApplyTracker } from "@/components/analytics/TaxonomyFilterApplyTracker";
import { MobileStoryCatalogLayout } from "@/components/stories/MobileStoryCatalogLayout";
import { DesktopStoryCatalogLayout } from "@/components/stories/DesktopStoryCatalogLayout";
import { buildCatalogHref } from "@/lib/discovery/catalog-url";
import { getTaxonomyH1, getTaxonomyIntro } from "@/lib/seo/taxonomy-seo";
import { getTaxonomyIndexConfigForType } from "@/lib/discovery/taxonomy-index-config";
import type { CatalogFilterOptions } from "@/lib/discovery/types";
import type { TaxonomyLandingContext } from "@/lib/discovery/types";
import type { StoryCatalogResult } from "@/lib/stories/get-public-stories";

type TaxonomyLandingPageProps = {
  context: TaxonomyLandingContext;
  catalog: StoryCatalogResult;
  filterOptions: CatalogFilterOptions;
  breadcrumbRoot?: { label: string; href: string };
  hideCatalogHeader?: boolean;
};

export function TaxonomyLandingPage({
  breadcrumbRoot = { label: "Khám phá", href: "/discover" },
  catalog,
  context,
  filterOptions,
  hideCatalogHeader = false
}: TaxonomyLandingPageProps) {
  const { parentGenre, term, type } = context;
  const taxonomyIndex = getTaxonomyIndexConfigForType(type);
  const layoutProps = {
    stories: catalog.stories,
    genres: catalog.genres,
    query: catalog.query,
    genre: catalog.genre,
    sort: catalog.sort,
    status: catalog.status,
    page: catalog.page,
    pageSize: catalog.pageSize,
    totalCount: catalog.totalCount,
    totalPages: catalog.totalPages,
    filters: catalog.filters,
    filterOptions,
    trackingContext: {
      sourceSurface: "taxonomy_page" as const,
      termId: term.id,
      termType: type,
      termSlug: term.slug,
      mainGenreId: type === "main_genre" ? term.id : null
    }
  };

  return (
    <div className="space-y-4">
      <TaxonomyPageViewTracker
        page={catalog.page}
        slug={term.slug}
        source="taxonomy_landing"
        termId={term.id}
        type={type}
      />
      <TaxonomyFilterApplyTracker
        filters={catalog.filters}
        sourcePage="taxonomy_page"
        termIds={[term.id]}
      />
      <nav className="text-[11px] text-zinc-500">
        <Link className="hover:text-zinc-300" href={breadcrumbRoot.href}>
          {breadcrumbRoot.label}
        </Link>
        <span className="mx-1.5 text-zinc-600">/</span>
        <Link className="hover:text-zinc-300" href="/truyen">
          Danh mục truyện
        </Link>
        {taxonomyIndex ? (
          <>
            <span className="mx-1.5 text-zinc-600">/</span>
            <Link className="hover:text-zinc-300" href={taxonomyIndex.pathname}>
              {taxonomyIndex.kicker}
            </Link>
          </>
        ) : null}
        <span className="mx-1.5 text-zinc-600">/</span>
        <span className="text-zinc-300">{term.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="page-title !mt-0">{getTaxonomyH1(term)}</h1>
        {parentGenre ? (
          <p className="text-sm text-zinc-400">
            Thuộc thể loại chính:{" "}
            <Link className="font-semibold text-cyan-200 hover:text-cyan-100" href={parentGenre.href}>
              {parentGenre.name}
            </Link>
          </p>
        ) : null}
        <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{getTaxonomyIntro(term)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="inline-flex text-xs font-semibold text-cyan-200 hover:text-cyan-100"
            href={buildCatalogHref(catalog.filters)}
          >
            Mở bộ lọc đầy đủ trên danh mục truyện
          </Link>
          {type === "main_genre" ? (
            <Link
              className="inline-flex text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              href={`/the-loai/${term.slug}/bang-xep-hang`}
            >
              Bảng xếp hạng thể loại
            </Link>
          ) : null}
        </div>
      </header>

      <MobileStoryCatalogLayout {...layoutProps} hideCatalogHeader={hideCatalogHeader} />
      <DesktopStoryCatalogLayout {...layoutProps} hideCatalogHeader={hideCatalogHeader} />
    </div>
  );
}
