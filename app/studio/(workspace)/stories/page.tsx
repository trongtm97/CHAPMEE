import Link from "next/link";
import { StudioTaxonomyFilterTracker } from "@/components/analytics/StudioTaxonomyFilterTracker";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { StudioStoriesAttention } from "@/components/studio/stories/StudioStoriesAttention";
import {
  buildStoriesQuery
} from "@/lib/studio/stories-query";
import { StudioStoriesFilters } from "@/components/studio/stories/StudioStoriesFilters";
import { StudioStoriesListSection } from "@/components/studio/stories/StudioStoriesListSection";
import { StudioStoriesOverview } from "@/components/studio/stories/StudioStoriesOverview";
import {
  storiesBtnPrimary,
  storiesBtnSecondary
} from "@/components/studio/stories/shared/styles";
import { ErrorState } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  getStudioStoriesPage,
  getStudioStorySearch,
  normalizeStudioStoryFilter,
  normalizeStudioStorySort,
  parseStudioStoryPageSize
} from "@/lib/studio/get-studio-stories";
import { getStudioTaxonomyFilterOptions } from "@/lib/studio/get-studio-taxonomy-filters";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  STUDIO_ACCESS_ERROR_TITLE,
  STUDIO_LOAD_STORIES_ERROR
} from "@/lib/studio/messages";
import { STUDIO_PAGE_WIDTH_CLASS, studioPath } from "@/lib/studio/constants";

type StudioStoriesPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
    size?: string;
    mainGenreTerm?: string;
    contentType?: string;
    presentationMode?: string;
    hasWarning?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioStoriesPage({
  searchParams
}: StudioStoriesPageProps) {
  const params = await searchParams;
  const activeFilter = normalizeStudioStoryFilter(params.status);
  const search = getStudioStorySearch(params.q);
  const activeSort = normalizeStudioStorySort(params.sort);
  const activeMainGenreTerm = (params.mainGenreTerm ?? "").trim();
  const activeContentTypeTerm = (params.contentType ?? "").trim();
  const activePresentationMode = (params.presentationMode ?? "").trim();
  const activeHasWarning = (params.hasWarning ?? "").trim();
  const activePageSize = parseStudioStoryPageSize(params.size);
  const basePath = studioPath("/stories");
  const query = buildStoriesQuery({
    filter: activeFilter,
    page: params.page,
    pageSize: activePageSize,
    search,
    sort: activeSort,
    mainGenreTerm: activeMainGenreTerm,
    contentType: activeContentTypeTerm,
    presentationMode: activePresentationMode,
    hasWarning: activeHasWarning
  });

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <h2 className="text-xl font-black text-white">Truyện & chương</h2>
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const [data, taxonomyOptions] = await Promise.all([
    getStudioStoriesPage(creatorProfile, {
      filter: activeFilter,
      page: params.page,
      pageSize: params.size,
      search,
      sort: activeSort,
      mainGenreTerm: activeMainGenreTerm,
      contentTypeTerm: activeContentTypeTerm,
      presentationMode: activePresentationMode,
      hasWarning: activeHasWarning
    }),
    getStudioTaxonomyFilterOptions()
  ]);

  const hasActiveFilters =
    Boolean(search) ||
    activeFilter !== "all" ||
    Boolean(activeMainGenreTerm) ||
    Boolean(activeContentTypeTerm) ||
    Boolean(activePresentationMode) ||
    Boolean(activeHasWarning) ||
    activeSort !== "updated" ||
    activePageSize !== 10 ||
    Boolean(params.page);

  return (
    <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-4 pb-6 sm:space-y-5`}>
      <StudioTaxonomyFilterTracker
        contentType={activeContentTypeTerm || undefined}
        hasWarning={activeHasWarning || undefined}
        mainGenreTerm={activeMainGenreTerm || undefined}
        presentationMode={activePresentationMode || undefined}
        search={search || undefined}
      />
      <div className="space-y-3">
        <div>
          <h2 className="text-xl font-black text-white">Truyện & chương</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Quản lý toàn bộ truyện, chương, lịch đăng và trạng thái xuất bản của bạn.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Link className={storiesBtnSecondary} href={studioPath("/import")}>
            Nhập hàng loạt
          </Link>
          <Link className={storiesBtnPrimary} href={studioPath("/stories/new")}>
            Tạo truyện mới
          </Link>
        </div>
      </div>

      {!data.error ? (
        <StudioStoriesOverview basePath={basePath} overview={data.overview} query={query} />
      ) : null}

      {!data.error && data.attentionItems.length > 0 ? (
        <StudioStoriesAttention items={data.attentionItems} />
      ) : null}

      <StudioStoriesFilters
        activeContentTypeTerm={activeContentTypeTerm}
        activeFilter={activeFilter}
        activeHasWarning={activeHasWarning}
        activeMainGenreTerm={activeMainGenreTerm}
        activePageSize={activePageSize}
        activePresentationMode={activePresentationMode}
        activeSort={activeSort}
        basePath={basePath}
        counts={data.counts}
        query={query}
        search={search}
        taxonomyOptions={taxonomyOptions}
      />

      {data.error ? (
        <ErrorState
          action={
            <Link className={storiesBtnPrimary} href={basePath}>
              Thử lại
            </Link>
          }
          message={data.error}
          title={STUDIO_LOAD_STORIES_ERROR}
        />
      ) : (
        <StudioStoriesListSection
          filteredStoryIds={data.filteredStoryIds}
          genres={data.genres}
          hasActiveFilters={hasActiveFilters}
          taxonomyOptions={taxonomyOptions}
          page={data.page}
          pageSize={data.pageSize}
          stories={data.stories}
          totalFiltered={data.total}
          totalPages={data.totalPages}
        />
      )}

      {!data.error ? (
        <StudioPagination
          buildHref={(page) =>
            buildStudioManagerHref(basePath, { ...query, page: String(page) })
          }
          page={data.page}
          totalPages={data.totalPages}
        />
      ) : null}
    </section>
  );
}
