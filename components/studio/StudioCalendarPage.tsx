"use client";

import Link from "next/link";
import { StudioCalendarEmptyState } from "@/components/studio/calendar/StudioCalendarEmptyState";
import { StudioCalendarErrorsPanel } from "@/components/studio/calendar/StudioCalendarErrorsPanel";
import { StudioCalendarFilters } from "@/components/studio/calendar/StudioCalendarFilters";
import { StudioCalendarHeader } from "@/components/studio/calendar/StudioCalendarHeader";
import { StudioCalendarItemCard } from "@/components/studio/calendar/StudioCalendarItemCard";
import { StudioCalendarPlaceholderView } from "@/components/studio/calendar/StudioCalendarPlaceholderView";
import { StudioCalendarStats } from "@/components/studio/calendar/StudioCalendarStats";
import { StudioCalendarSuggestions } from "@/components/studio/calendar/StudioCalendarSuggestions";
import { StudioCalendarTodayPanel } from "@/components/studio/calendar/StudioCalendarTodayPanel";
import { StudioCalendarViewSwitcher } from "@/components/studio/calendar/StudioCalendarViewSwitcher";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { StudioPagination } from "@/components/studio/StudioPagination";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import { draftsBtnSecondary } from "@/components/studio/drafts/shared/styles";
import type {
  CalendarContentFilter,
  CalendarListTab,
  CalendarPageSize,
  CalendarStats,
  CalendarTimeFilter,
  CalendarViewMode,
  ScheduledPublicationListItem
} from "@/types/scheduling";

const TABS: Array<{ label: string; value: CalendarListTab }> = [
  { label: "Sắp tới", value: "upcoming" },
  { label: "Hôm nay", value: "today" },
  { label: "Đã đăng", value: "published" },
  { label: "Lỗi", value: "failed" },
  { label: "Đã hủy", value: "canceled" },
  { label: "Tất cả", value: "all" }
];

type StudioCalendarPageProps = {
  activeTab: CalendarListTab;
  activeTime: CalendarTimeFilter;
  activeType: CalendarContentFilter;
  activeView: CalendarViewMode;
  counts: Record<CalendarListTab, number>;
  failedItems: ScheduledPublicationListItem[];
  hasActiveFilters: boolean;
  items: ScheduledPublicationListItem[];
  page: number;
  pageSize: CalendarPageSize;
  query: Record<string, string | undefined>;
  search: string;
  stats: CalendarStats;
  todayItems: ScheduledPublicationListItem[];
  total: number;
  totalPages: number;
  writeChapterHref: string;
};

export function StudioCalendarPage({
  activeTab,
  activeTime,
  activeType,
  activeView,
  counts,
  failedItems,
  hasActiveFilters,
  items,
  page,
  pageSize,
  query,
  search,
  stats,
  todayItems,
  total,
  totalPages,
  writeChapterHref
}: StudioCalendarPageProps) {
  const basePath = studioPath("/calendar");
  const showGlobalEmpty = counts.all === 0 && !hasActiveFilters;

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <StudioCalendarHeader
        stats={stats}
        writeChapterHref={writeChapterHref}
      />

      {!showGlobalEmpty ? (
        <StudioCalendarStats basePath={basePath} stats={stats} />
      ) : null}

      {!showGlobalEmpty ? (
        <>
          <StudioCalendarFilters
            activeTab={activeTab}
            activeTime={activeTime}
            activeType={activeType}
            activeView={activeView}
            basePath={basePath}
            pageSize={pageSize}
            query={query}
            search={search}
          />

          <StudioCalendarViewSwitcher
            activeView={activeView}
            basePath={basePath}
            query={query}
          />

          <StudioManagerTabs
            active={activeTab}
            basePath={basePath}
            counts={counts}
            filterParam="tab"
            query={query}
            tabs={TABS}
          />
        </>
      ) : null}

      {showGlobalEmpty ? (
        <StudioCalendarEmptyState writeChapterHref={writeChapterHref} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-5">
          <div className="space-y-4 min-w-0">
            <StudioCalendarTodayPanel
              items={todayItems}
              writeChapterHref={writeChapterHref}
            />

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white sm:text-base">
                  {activeTab === "upcoming" ? "Lịch sắp tới" : "Danh sách lịch đăng"}
                </h2>
                {total > 0 ? (
                  <span className="text-xs text-zinc-500">
                    {total.toLocaleString("vi-VN")} mục
                  </span>
                ) : null}
              </div>

              {activeView === "list" ? (
                items.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-8 text-center">
                    <p className="text-base font-semibold text-white">
                      Chưa có lịch đăng trong mục này
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Thử đổi bộ lọc hoặc lên lịch từ editor chương/Reels.
                    </p>
                    <Link
                      className={`${draftsBtnSecondary} mt-4 inline-flex`}
                      href={studioPath("/stories")}
                    >
                      Lên lịch mới
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <StudioCalendarItemCard item={item} key={item.id} />
                    ))}
                  </div>
                )
              ) : (
                <StudioCalendarPlaceholderView mode={activeView} />
              )}

              {activeView === "list" ? (
                <StudioPagination
                  buildHref={(nextPage) =>
                    buildStudioManagerHref(basePath, {
                      ...query,
                      page: String(nextPage)
                    })
                  }
                  page={page}
                  totalPages={totalPages}
                />
              ) : null}
            </section>
          </div>

          <aside className="space-y-4">
            <StudioCalendarSuggestions />
            <StudioCalendarErrorsPanel
              basePath={basePath}
              failedCount={stats.failed}
              items={failedItems}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
