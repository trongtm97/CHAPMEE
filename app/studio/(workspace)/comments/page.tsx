import { StudioCommentsPage } from "@/components/studio/StudioCommentsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  buildCommentsQuery,
  getStudioComments,
  normalizeStudioCommentFilter,
  normalizeStudioCommentSort,
  normalizeStudioCommentTimeFilter,
  parseCommentPageSize
} from "@/lib/studio/get-studio-comments";
import { studioPath } from "@/lib/studio/constants";

type StudioCommentsRouteProps = {
  searchParams: Promise<{
    filter?: string;
    story?: string;
    q?: string;
    time?: string;
    sort?: string;
    page?: string;
    size?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioCommentsRoute({
  searchParams
}: StudioCommentsRouteProps) {
  const params = await searchParams;
  const basePath = studioPath("/comments");
  const activeFilter = normalizeStudioCommentFilter(params.filter);
  const activeTime = normalizeStudioCommentTimeFilter(params.time);
  const activeSort = normalizeStudioCommentSort(params.sort);
  const activePageSize = parseCommentPageSize(params.size);
  const search = (params.q ?? "").trim();

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <h1 className="text-xl font-black text-white">Bình luận</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioComments(creatorProfile, profile.id, {
    filter: activeFilter,
    page: params.page,
    pageSize: activePageSize,
    q: search,
    sort: activeSort,
    storyId: params.story,
    time: activeTime
  });

  const query = buildCommentsQuery({
    filter: activeFilter,
    page: params.page,
    pageSize: activePageSize,
    q: search,
    sort: activeSort,
    story: params.story,
    time: activeTime
  });

  return (
    <section className="w-full min-w-0">
      <StudioCommentsPage
        activeFilter={activeFilter}
        activePageSize={activePageSize}
        activeSort={activeSort}
        activeTime={activeTime}
        activeStoryId={params.story}
        data={data}
        query={query}
        searchQuery={search}
      />
    </section>
  );
}
