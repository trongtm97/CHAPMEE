import { StudioReelsPage } from "@/components/studio/reels/StudioReelsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { getCreatorStoriesForReels } from "@/lib/reels/get-reels-form-data";
import { getStudioReelsPage } from "@/lib/reels/get-studio-reels-page";
import {
  buildReelsQuery,
  normalizeReelsSort,
  normalizeReelsSourceFilter,
  normalizeReelsTab,
  normalizeReelsTimeFilter,
  parseReelsPageSize
} from "@/lib/reels/reels-query";
import { REELS_LIST_PAGE_SIZE_DEFAULT } from "@/types/reels";
import { studioReelsPath } from "@/lib/routes/reels-paths";

type StudioReelsRouteProps = {
  searchParams: Promise<{
    page?: string;
    tab?: string;
    q?: string;
    story?: string;
    genre?: string;
    source?: string;
    time?: string;
    sort?: string;
    size?: string;
    from?: string;
    to?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioReelsRoute({ searchParams }: StudioReelsRouteProps) {
  const params = await searchParams;
  const activeTab = normalizeReelsTab(params.tab);
  const activeSort = normalizeReelsSort(params.sort);
  const activeTime = normalizeReelsTimeFilter(params.time);
  const activeSource = normalizeReelsSourceFilter(params.source);
  const activePageSize = parseReelsPageSize(params.size);
  const activeStoryId = (params.story ?? "").trim();
  const activeGenreId = (params.genre ?? "").trim();
  const search = (params.q ?? "").trim();
  const dateFrom = (params.from ?? "").trim();
  const dateTo = (params.to ?? "").trim();
  const basePath = studioReelsPath();

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <div>
          <h1 className="text-xl font-black text-white">Reels cua toi</h1>
          <ErrorState message={error} title="Khong tai duoc quyen truy cap Studio" />
        </div>
      </section>
    );
  }

  const [data, storiesForForm] = await Promise.all([
    getStudioReelsPage(profile.id, creatorProfile.id, {
      from: dateFrom,
      genreId: activeGenreId,
      page: params.page,
      pageSize: params.size,
      search,
      sort: activeSort,
      source: activeSource,
      storyId: activeStoryId,
      tab: activeTab,
      time: activeTime,
      to: dateTo
    }),
    getCreatorStoriesForReels(creatorProfile)
  ]);

  const stories =
    (storiesForForm.stories ?? []).map((story) => ({
      id: story.id as string,
      slug: story.slug as string,
      title: story.title as string
    })) ?? [];

  const authorName = creatorProfile.display_name || "Tac gia";

  const query = buildReelsQuery({
    from: dateFrom,
    genreId: activeGenreId,
    page: params.page,
    pageSize: activePageSize,
    search,
    sort: activeSort,
    source: activeSource,
    storyId: activeStoryId,
    tab: activeTab,
    time: activeTime,
    to: dateTo
  });

  const hasActiveFilters =
    Boolean(search) ||
    activeTab !== "all" ||
    Boolean(activeStoryId) ||
    Boolean(activeGenreId) ||
    activeSource !== "all" ||
    activeTime !== "all" ||
    activeSort !== "updated" ||
    activePageSize !== REELS_LIST_PAGE_SIZE_DEFAULT ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(params.page);

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      {data.error ? (
        <>
          <h1 className="text-xl font-black text-white">Reels cua toi</h1>
          <ErrorState message={data.error} title="Khong tai duoc danh sach Reels" />
        </>
      ) : (
        <StudioReelsPage
          activeGenreId={activeGenreId}
          activeSort={activeSort}
          activeSource={activeSource}
          activeStoryId={activeStoryId}
          activeTab={activeTab}
          activeTime={activeTime}
          allTasks={data.allTasks}
          authorName={authorName}
          counts={data.counts}
          dateFrom={dateFrom}
          dateTo={dateTo}
          filteredIds={data.filteredIds}
          genreOptions={data.genreOptions}
          hasActiveFilters={hasActiveFilters}
          items={data.items}
          page={data.page}
          pageSize={activePageSize}
          query={query}
          search={search}
          stats={data.stats}
          stories={stories}
          storyOptions={data.storyOptions}
          total={data.total}
          totalPages={data.totalPages}
        />
      )}
    </section>
  );
}
