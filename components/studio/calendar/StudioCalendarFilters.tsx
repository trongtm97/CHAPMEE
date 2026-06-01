"use client";

import Link from "next/link";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  CALENDAR_PAGE_SIZE_DEFAULT,
  type CalendarContentFilter,
  type CalendarListTab,
  type CalendarPageSize,
  type CalendarTimeFilter,
  type CalendarViewMode
} from "@/types/scheduling";
import {
  calendarBtnPrimary,
  calendarBtnSecondary
} from "@/components/studio/calendar/shared/styles";

type StudioCalendarFiltersProps = {
  activeTab: CalendarListTab;
  activeTime: CalendarTimeFilter;
  activeType: CalendarContentFilter;
  activeView: CalendarViewMode;
  basePath: string;
  pageSize: CalendarPageSize;
  query: Record<string, string | undefined>;
  search: string;
};

export function StudioCalendarFilters({
  activeTab,
  activeTime,
  activeType,
  activeView,
  basePath,
  pageSize,
  query,
  search
}: StudioCalendarFiltersProps) {
  const preservedQuery = {
    ...query,
    page: undefined,
    tab: activeTab === "upcoming" ? undefined : activeTab,
    view: activeView === "list" ? undefined : activeView
  };

  return (
    <form
      action={basePath}
      className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4"
      method="get"
    >
      <AppSearchField
        defaultValue={search}
        placeholder="Tìm tên truyện, chương, Reels..."
        variant="field"
      />

      {activeTab !== "upcoming" ? (
        <input name="tab" type="hidden" value={activeTab} />
      ) : null}
      {activeView !== "list" ? <input name="view" type="hidden" value={activeView} /> : null}
      {pageSize !== CALENDAR_PAGE_SIZE_DEFAULT ? (
        <input name="size" type="hidden" value={String(pageSize)} />
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold text-zinc-400">Loại nội dung</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
            defaultValue={activeType}
            name="type"
          >
            <option value="all">Tất cả</option>
            <option value="story">Truyện</option>
            <option value="chapter">Chương</option>
            <option value="reels">Reels</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold text-zinc-400">Trạng thái</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
            defaultValue={activeTab}
            name="tab"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="upcoming">Sắp tới</option>
            <option value="today">Hôm nay</option>
            <option value="published">Đã đăng</option>
            <option value="failed">Lỗi</option>
            <option value="canceled">Đã hủy</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold text-zinc-400">Thời gian</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
            defaultValue={activeTime}
            name="time"
          >
            <option value="all">Tất cả</option>
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày tới</option>
            <option value="30d">30 ngày tới</option>
            <option value="month">Tháng này</option>
          </select>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold text-zinc-400">Mỗi trang</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
            defaultValue={String(pageSize)}
            name="size"
          >
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="20">20</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={calendarBtnPrimary} type="submit">
          Áp dụng
        </button>
        <Link className={calendarBtnSecondary} href={basePath}>
          Xóa lọc
        </Link>
      </div>
    </form>
  );
}
