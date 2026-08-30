import { StudioMediaHub } from "@/components/studio/media/StudioMediaHub";
import { ErrorState } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { searchStoriesForQuickPickAction } from "@/lib/studio/import-export-server";
import { STUDIO_PAGE_WIDTH_CLASS, studioPath } from "@/lib/studio/constants";
import { loadStudioMediaHubForCreator } from "@/lib/studio/get-studio-media-hub";
import {
  getStudioHubSearch,
  normalizeStudioHubMediaTab
} from "@/lib/studio/studio-hub-filters";

export const dynamic = "force-dynamic";

type StudioMediaHubPageProps = {
  searchParams: Promise<{
    q?: string;
    story?: string;
    tab?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function StudioMediaHubPage({ searchParams }: StudioMediaHubPageProps) {
  const params = await searchParams;
  const basePath = studioPath("/media");
  const search = getStudioHubSearch(params.q);
  const activeTab = normalizeStudioHubMediaTab(params.tab);
  const activeStoryId = params.story?.trim() ?? "";
  const query = {
    page: params.page,
    pageSize: params.pageSize,
    q: search || undefined,
    story: activeStoryId || undefined,
    tab: activeTab === "images" ? undefined : activeTab
  };

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <h1 className="text-xl font-black text-white">Media</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const [data, picker] = await Promise.all([
    loadStudioMediaHubForCreator(creatorProfile, {
      page: params.page,
      pageSize: params.pageSize,
      search,
      storyId: activeStoryId,
      tab: params.tab
    }),
    searchStoriesForQuickPickAction({ page: 1 })
  ]);

  return (
    <section className={STUDIO_PAGE_WIDTH_CLASS}>
      <StudioMediaHub
        activeStoryId={activeStoryId}
        activeTab={activeTab}
        basePath={basePath}
        data={data}
        pickerStories={picker.stories}
        pickerTotal={picker.total}
        query={query}
        search={search}
      />
    </section>
  );
}
