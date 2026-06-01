import { StudioAnalyticsPage } from "@/components/studio/analytics/StudioAnalyticsPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  buildAnalyticsQuery,
  normalizeAnalyticsContentFilter,
  normalizeAnalyticsRange
} from "@/lib/studio/analytics-query";
import { getStudioAnalytics } from "@/lib/studio/get-studio-analytics";
import { studioPath } from "@/lib/studio/constants";

type StudioAnalyticsRouteProps = {
  searchParams: Promise<{
    content?: string;
    q?: string;
    range?: string;
    story?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioAnalyticsRoute({
  searchParams
}: StudioAnalyticsRouteProps) {
  const params = await searchParams;
  const basePath = studioPath("/analytics");
  const activeRange = normalizeAnalyticsRange(params.range);
  const activeContent = normalizeAnalyticsContentFilter(params.content);
  const search = (params.q ?? "").trim();

  const { creatorProfile, error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !creatorProfile || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <h1 className="text-xl font-black text-white">Thống kê Studio</h1>
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const data = await getStudioAnalytics(creatorProfile, profile.id, {
    content: activeContent,
    range: activeRange,
    search,
    storyId: params.story
  });

  const query = buildAnalyticsQuery({
    content: activeContent,
    range: activeRange,
    search,
    story: params.story
  });

  return (
    <section className="w-full min-w-0">
      <StudioAnalyticsPage
        activeContent={activeContent}
        activeRange={activeRange}
        activeStoryId={params.story}
        data={data}
        query={query}
      />
    </section>
  );
}
