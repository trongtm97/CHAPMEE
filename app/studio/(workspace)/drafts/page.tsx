import { StudioDraftsPage } from "@/components/studio/StudioDraftsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  buildDraftsQuery,
  normalizeDraftSort,
  normalizeDraftStatusFilter,
  normalizeDraftTimeFilter,
  parseDraftPageSize
} from "@/lib/studio/drafts-query";
import {
  getStudioDraftsPage,
  normalizeDraftListFilter
} from "@/lib/studio/get-drafts";
import { DRAFT_LIST_PAGE_SIZE_DEFAULT } from "@/types/drafts";
import { studioPath } from "@/lib/studio/constants";
import {
  STUDIO_ACCESS_ERROR_TITLE,
  STUDIO_LOAD_STORIES_ERROR
} from "@/lib/studio/messages";
import { StudioDraftsHeader } from "@/components/studio/drafts/StudioDraftsHeader";

type StudioDraftsRouteProps = {
  searchParams: Promise<{
    q?: string;
    type?: string;
    status?: string;
    time?: string;
    sort?: string;
    page?: string;
    size?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioDraftsRoute({
  searchParams
}: StudioDraftsRouteProps) {
  const params = await searchParams;
  const activeFilter = normalizeDraftListFilter(params.type);
  const activeStatus = normalizeDraftStatusFilter(params.status);
  const activeTime = normalizeDraftTimeFilter(params.time);
  const activeSort = normalizeDraftSort(params.sort);
  const activePageSize = parseDraftPageSize(params.size);
  const search = (params.q ?? "").trim();
  const basePath = studioPath("/drafts");

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <StudioDraftsHeader
          basePath={basePath}
          staleCount={0}
          writeChapterHref={studioPath("/stories")}
        />
        <ErrorState message={error} title={STUDIO_ACCESS_ERROR_TITLE} />
      </section>
    );
  }

  const data = await getStudioDraftsPage(profile.id, {
    filter: activeFilter,
    page: params.page,
    pageSize: params.size,
    search,
    sort: activeSort,
    status: activeStatus,
    time: activeTime
  });

  const query = buildDraftsQuery({
    filter: activeFilter,
    page: params.page,
    pageSize: activePageSize,
    search,
    sort: activeSort,
    status: activeStatus,
    time: activeTime
  });

  const hasActiveFilters =
    Boolean(search) ||
    activeFilter !== "all" ||
    activeStatus !== "all" ||
    activeTime !== "all" ||
    activeSort !== "updated" ||
    activePageSize !== DRAFT_LIST_PAGE_SIZE_DEFAULT ||
    Boolean(params.page);

  return (
    <section className="w-full min-w-0 space-y-4 pb-6 sm:space-y-5">
      {data.error ? (
        <>
          <StudioDraftsHeader
            basePath={basePath}
            staleCount={0}
            writeChapterHref={data.writeChapterHref}
          />
          <ErrorState message={data.error} title={STUDIO_LOAD_STORIES_ERROR} />
        </>
      ) : (
        <StudioDraftsPage
          activeFilter={activeFilter}
          activePageSize={activePageSize}
          activeSort={activeSort}
          activeStatus={activeStatus}
          activeTime={activeTime}
          attentionDrafts={data.attentionDrafts}
          counts={data.counts}
          drafts={data.drafts}
          filteredIds={data.filteredIds}
          hasActiveFilters={hasActiveFilters}
          page={data.page}
          query={query}
          recentDrafts={data.recentDrafts}
          search={search}
          stats={data.stats}
          total={data.total}
          totalPages={data.totalPages}
          writeChapterHref={data.writeChapterHref}
        />
      )}
    </section>
  );
}
