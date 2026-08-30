import { StudioAudioHub } from "@/components/studio/audio/StudioAudioHub";
import { ErrorState } from "@/components/ui";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import { searchStoriesForQuickPickAction } from "@/lib/studio/import-export-server";
import { STUDIO_PAGE_WIDTH_CLASS, studioPath } from "@/lib/studio/constants";
import {
  getStudioHubSearch,
  normalizeStudioAudioHubStatus
} from "@/lib/studio/studio-hub-filters";
import { getStudioAudioHubData } from "@/lib/studio/get-studio-audio-hub";

export const dynamic = "force-dynamic";

type StudioAudioHubPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    story?: string;
    page?: string;
    pageSize?: string;
  }>;
};

export default async function StudioAudioHubPage({ searchParams }: StudioAudioHubPageProps) {
  const params = await searchParams;
  const basePath = studioPath("/audio");
  const search = getStudioHubSearch(params.q);
  const activeStatus = normalizeStudioAudioHubStatus(params.status);
  const activeStoryId = params.story?.trim() ?? "";
  const query = {
    page: params.page,
    pageSize: params.pageSize,
    q: search || undefined,
    status: activeStatus === "all" ? undefined : activeStatus,
    story: activeStoryId || undefined
  };

  const { creatorProfile, error } = await getStudioAccess(basePath);

  if (error || !creatorProfile) {
    return (
      <section className={`${STUDIO_PAGE_WIDTH_CLASS} space-y-6`}>
        <h1 className="text-xl font-black text-white">Audio</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const [data, picker] = await Promise.all([
    getStudioAudioHubData(creatorProfile, {
      page: params.page,
      pageSize: params.pageSize,
      search,
      status: params.status,
      storyId: activeStoryId
    }),
    searchStoriesForQuickPickAction({ page: 1 })
  ]);

  return (
    <section className={STUDIO_PAGE_WIDTH_CLASS}>
      <StudioAudioHub
        activeStatus={activeStatus}
        activeStoryId={activeStoryId}
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
