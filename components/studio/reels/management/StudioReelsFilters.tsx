"use client";

import Link from "next/link";
import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  REELS_LIST_PAGE_SIZE_DEFAULT,
  type ReelsListPageSize,
  type ReelsListSort,
  type ReelsListTab,
  type ReelsSourceFilter,
  type ReelsTimeFilter
} from "@/types/reels";
import type { ReelsGenreOption, ReelsStoryOption } from "@/lib/reels/get-studio-reels-page";
import {
  reelsBtnPrimary,
  reelsBtnSecondary
} from "@/components/studio/reels/management/shared/styles";

type StudioReelsFiltersProps = {
  activeGenreId: string;
  activeSort: ReelsListSort;
  activeSource: ReelsSourceFilter;
  activeStoryId: string;
  activeTab: ReelsListTab;
  activeTime: ReelsTimeFilter;
  basePath: string;
  dateFrom: string;
  dateTo: string;
  genreOptions: ReelsGenreOption[];
  pageSize: ReelsListPageSize;
  search: string;
  storyOptions: ReelsStoryOption[];
};

export function StudioReelsFilters({
  activeGenreId,
  activeSort,
  activeSource,
  activeStoryId,
  activeTab,
  activeTime,
  basePath,
  dateFrom,
  dateTo,
  genreOptions,
  pageSize,
  search,
  storyOptions
}: StudioReelsFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <p className="text-xs font-semibold text-zinc-300">Bộ lọc</p>
        <button
          className={reelsBtnSecondary}
          onClick={() => setMobileOpen((value) => !value)}
          type="button"
        >
          {mobileOpen ? "Thu gọn" : "Mở bộ lọc"}
        </button>
      </div>

      <form
        action={basePath}
        className={`mt-0 space-y-3 ${mobileOpen ? "block" : "hidden lg:block"}`}
        method="get"
      >
        <AppSearchField
          defaultValue={search}
          placeholder="Tìm tiêu đề, truyện, chương, hook..."
          variant="field"
        />

        {activeTab !== "all" ? <input name="tab" type="hidden" value={activeTab} /> : null}

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Trạng thái</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={activeTab}
              name="tab"
            >
              <option value="all">Tất cả</option>
              <option value="draft">Nháp</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="published">Đang đăng</option>
              <option value="hidden">Đã ẩn</option>
              <option value="needs_fix">Cần sửa</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Truyện</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={activeStoryId}
              name="story"
            >
              <option value="">Tất cả truyện</option>
              {storyOptions.map((story) => (
                <option key={story.id} value={story.id}>
                  {story.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Thể loại</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={activeGenreId}
              name="genre"
            >
              <option value="">Tất cả thể loại</option>
              {genreOptions.map((genre) => (
                <option key={genre.id} value={genre.id}>
                  {genre.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Nguồn tạo</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={activeSource}
              name="source"
            >
              <option value="all">Tất cả</option>
              <option value="manual">Tạo thủ công</option>
              <option value="chapter">Tạo từ chương</option>
              <option disabled value="import">
                Nhập hàng loạt
              </option>
              <option disabled value="ai">
                Gợi ý AI
              </option>
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
              <option value="7d">7 ngày</option>
              <option value="30d">30 ngày</option>
              <option value="custom">Tùy chọn</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Từ ngày</span>
            <input
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={dateFrom}
              name="from"
              type="date"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Đến ngày</span>
            <input
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={dateTo}
              name="to"
              type="date"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-xs font-semibold text-zinc-400">Sắp xếp</span>
            <select
              className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
              defaultValue={activeSort}
              name="sort"
            >
              <option value="updated">Mới cập nhật</option>
              <option value="created">Mới tạo</option>
              <option value="views">Lượt xem cao</option>
              <option value="ctr">CTR cao</option>
              <option value="reads">Chuyển đổi cao</option>
              <option value="needs_attention">Cần xử lý trước</option>
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
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={reelsBtnPrimary} type="submit">
            Áp dụng
          </button>
          <Link className={reelsBtnSecondary} href={basePath}>
            Xóa lọc
          </Link>
        </div>
      </form>
    </div>
  );
}
