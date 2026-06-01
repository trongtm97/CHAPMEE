import { StudioCalendarPage } from "@/components/studio/StudioCalendarPage";
import { ErrorState } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getStudioAccess } from "@/lib/creator/getStudioAccess";
import {
  buildCalendarQuery,
  normalizeCalendarContentFilter,
  normalizeCalendarTab,
  normalizeCalendarTimeFilter,
  normalizeCalendarView,
  parseCalendarPageSize
} from "@/lib/studio/scheduling/calendar-query";
import { getScheduledPublicationsPage } from "@/lib/studio/scheduling/get-scheduled-publications";
import { CALENDAR_PAGE_SIZE_DEFAULT } from "@/types/scheduling";
import { studioPath } from "@/lib/studio/constants";
import { createClient } from "@/lib/supabase/server";
import { StudioCalendarHeader } from "@/components/studio/calendar/StudioCalendarHeader";

type StudioCalendarRouteProps = {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    q?: string;
    type?: string;
    time?: string;
    view?: string;
    size?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudioCalendarRoute({
  searchParams
}: StudioCalendarRouteProps) {
  const params = await searchParams;
  const activeTab = normalizeCalendarTab(params.tab);
  const activeType = normalizeCalendarContentFilter(params.type);
  const activeTime = normalizeCalendarTimeFilter(params.time);
  const activeView = normalizeCalendarView(params.view);
  const activePageSize = parseCalendarPageSize(params.size);
  const search = (params.q ?? "").trim();
  const basePath = studioPath("/calendar");

  const { error } = await getStudioAccess(basePath);
  const { profile } = await getCurrentUser();

  if (error || !profile?.id) {
    return (
      <section className="w-full min-w-0 space-y-6">
        <StudioCalendarHeader
          stats={{
            canceled: 0,
            failed: 0,
            published7d: 0,
            today: 0,
            upcoming: 0
          }}
          writeChapterHref={studioPath("/stories")}
        />
        <ErrorState message={error} title="Không tải được quyền truy cập Studio" />
      </section>
    );
  }

  const supabase = await createClient();
  const data = await getScheduledPublicationsPage(supabase, profile.id, {
    page: params.page,
    pageSize: params.size,
    search,
    tab: activeTab,
    time: activeTime,
    type: activeType
  });

  const query = buildCalendarQuery({
    page: params.page,
    pageSize: activePageSize,
    search,
    tab: activeTab,
    time: activeTime,
    type: activeType,
    view: activeView
  });

  const hasActiveFilters =
    Boolean(search) ||
    activeTab !== "upcoming" ||
    activeType !== "all" ||
    activeTime !== "all" ||
    activeView !== "list" ||
    activePageSize !== CALENDAR_PAGE_SIZE_DEFAULT ||
    Boolean(params.page);

  return (
    <section className="w-full min-w-0 space-y-4 sm:space-y-5">
      {data.error ? (
        <>
          <StudioCalendarHeader
            stats={data.stats}
            writeChapterHref={data.writeChapterHref}
          />
          <ErrorState message={data.error} title="Không tải được lịch đăng" />
        </>
      ) : (
        <StudioCalendarPage
          activeTab={data.tab}
          activeTime={activeTime}
          activeType={activeType}
          activeView={activeView}
          counts={data.counts}
          failedItems={data.failedItems}
          hasActiveFilters={hasActiveFilters}
          items={data.items}
          page={data.page}
          pageSize={activePageSize}
          query={query}
          search={search}
          stats={data.stats}
          todayItems={data.todayItems}
          total={data.total}
          totalPages={data.totalPages}
          writeChapterHref={data.writeChapterHref}
        />
      )}
    </section>
  );
}
