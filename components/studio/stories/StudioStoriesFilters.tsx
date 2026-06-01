"use client";

import Link from "next/link";
import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  STUDIO_LIST_PAGE_SIZES,
  type StudioStoryListFilter,
  type StudioStorySort,
  type StudioListPageSize
} from "@/types/studio";
import type { StudioTaxonomyFilterOptions } from "@/lib/studio/get-studio-taxonomy-filters";
import {
  storiesBtnPrimary,
  storiesBtnSecondary
} from "@/components/studio/stories/shared/styles";

type StudioStoriesFiltersProps = {
  activeFilter: StudioStoryListFilter;
  activePageSize: StudioListPageSize;
  activeSort: StudioStorySort;
  basePath: string;
  counts: Record<StudioStoryListFilter, number>;
  taxonomyOptions?: StudioTaxonomyFilterOptions | null;
  activeMainGenreTerm?: string;
  activeContentTypeTerm?: string;
  activePresentationMode?: string;
  activeHasWarning?: string;
  query: Record<string, string | undefined>;
  search: string;
};

const STORY_TABS: Array<{ label: string; value: StudioStoryListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Nháp", value: "draft" },
  { label: "Đang đăng", value: "live" },
  { label: "Đã lên lịch", value: "scheduled" },
  { label: "Hoàn thành", value: "completed" },
  { label: "Cần sửa", value: "rejected" },
  { label: "Đã ẩn", value: "hidden" },
  { label: "Thiếu ảnh bìa", value: "missing_cover" }
];

const FEATURED_GENRE_LIMIT = 7;

function FilterChip({
  active,
  children,
  href
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300 hover:border-white/20"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function StatusChip({
  active,
  children,
  href
}: {
  active: boolean;
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function StudioStoriesFilters({
  activeFilter,
  activePageSize,
  activeSort,
  basePath,
  counts,
  taxonomyOptions,
  activeMainGenreTerm = "",
  activeContentTypeTerm = "",
  activePresentationMode = "",
  activeHasWarning = "",
  query,
  search
}: StudioStoriesFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [genreSheetOpen, setGenreSheetOpen] = useState(false);

  const taxonomyMainGenres = taxonomyOptions?.mainGenres ?? [];
  const featuredTaxonomyGenres = taxonomyMainGenres.slice(0, FEATURED_GENRE_LIMIT);
  const overflowTaxonomyGenres = taxonomyMainGenres.slice(FEATURED_GENRE_LIMIT);
  const activeMainGenreLabel = taxonomyMainGenres.find(
    (genre) => genre.id === activeMainGenreTerm
  )?.label;

  const chipQuery = {
    ...query,
    page: undefined
  };

  return (
    <div className="space-y-3">
      <div className="chap-card-soft space-y-2.5 p-2.5 sm:p-3">
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <p className="text-xs font-semibold text-zinc-300">Bộ lọc danh mục</p>
          <button
            className={`${storiesBtnSecondary} min-h-10 px-3 text-xs sm:min-h-9 sm:w-auto`}
            onClick={() => setMobileOpen((value) => !value)}
            type="button"
          >
            {mobileOpen ? "Thu gọn" : "Mở bộ lọc"}
          </button>
        </div>

        <div className={`space-y-2.5 ${mobileOpen ? "block" : "hidden lg:block"}`}>
          <form action={basePath} className="space-y-2.5" method="get">
            {activeFilter !== "all" ? (
              <input name="status" type="hidden" value={activeFilter} />
            ) : null}
            {activeMainGenreTerm ? (
              <input name="mainGenreTerm" type="hidden" value={activeMainGenreTerm} />
            ) : null}

            <AppSearchField
              defaultValue={search}
              placeholder="Tên truyện, mô tả, thể loại..."
            />

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block space-y-1 text-sm">
                <span className="text-xs font-semibold text-zinc-400">Sắp xếp</span>
                <select
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                  defaultValue={activeSort}
                  name="sort"
                >
                  <option value="updated">Cập nhật gần nhất</option>
                  <option value="created">Tạo mới nhất</option>
                  <option value="reads_7d">Lượt đọc 7 ngày cao nhất</option>
                  <option value="reads">Lượt đọc nhiều nhất</option>
                  <option value="saves">Lượt lưu cao nhất</option>
                  <option value="comments">Bình luận mới nhiều nhất</option>
                  <option value="chapters">Số chương nhiều nhất</option>
                  <option value="main_genre">Thể loại chính A–Z</option>
                  <option value="needs_attention">Cần xử lý trước</option>
                  <option value="title">Tên A–Z</option>
                  <option value="updated_asc">Cũ nhất</option>
                </select>
              </label>

              {taxonomyOptions ? (
                <>
                  <label className="block space-y-1 text-sm">
                    <span className="text-xs font-semibold text-zinc-400">Thể loại chính</span>
                    <select
                      className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                      defaultValue={activeMainGenreTerm}
                      name="mainGenreTerm"
                    >
                      <option value="">Tất cả</option>
                      {taxonomyOptions.mainGenres.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-xs font-semibold text-zinc-400">Loại nội dung</span>
                    <select
                      className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                      defaultValue={activeContentTypeTerm}
                      name="contentType"
                    >
                      <option value="">Tất cả</option>
                      {taxonomyOptions.contentTypes.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-xs font-semibold text-zinc-400">Format</span>
                    <select
                      className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                      defaultValue={activePresentationMode}
                      name="presentationMode"
                    >
                      <option value="">Tất cả</option>
                      {taxonomyOptions.presentationModes.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="text-xs font-semibold text-zinc-400">Cảnh báo</span>
                    <select
                      className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                      defaultValue={activeHasWarning}
                      name="hasWarning"
                    >
                      <option value="">Mọi</option>
                      <option value="yes">Có cảnh báo</option>
                      <option value="no">Không có</option>
                    </select>
                  </label>
                </>
              ) : null}

              <label className="block space-y-1 text-sm">
                <span className="text-xs font-semibold text-zinc-400">Mỗi trang</span>
                <select
                  className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
                  defaultValue={activePageSize}
                  name="size"
                >
                  {STUDIO_LIST_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:flex sm:items-end lg:contents">
                <button className={`${storiesBtnPrimary} min-h-10`} type="submit">
                  Áp dụng
                </button>
                <Link className={`${storiesBtnSecondary} min-h-10`} href={basePath}>
                  Xóa lọc
                </Link>
              </div>
            </div>
          </form>

          {taxonomyMainGenres.length > 0 ? (
            <>
              {activeMainGenreLabel ? (
                <p className="truncate text-[11px] text-cyan-200">
                  Thể loại: {activeMainGenreLabel}
                </p>
              ) : null}
              <div className="no-scrollbar -mx-0.5 overflow-x-auto px-0.5">
                <div className="flex min-w-max gap-1.5 pb-0.5">
                  <FilterChip
                    active={!activeMainGenreTerm}
                    href={buildStudioManagerHref(basePath, {
                      ...chipQuery,
                      mainGenreTerm: undefined
                    })}
                  >
                    Mọi thể loại
                  </FilterChip>
                  {featuredTaxonomyGenres.map((genre) => (
                    <FilterChip
                      active={activeMainGenreTerm === genre.id}
                      href={buildStudioManagerHref(basePath, {
                        ...chipQuery,
                        mainGenreTerm: genre.id
                      })}
                      key={genre.id}
                    >
                      {genre.label}
                    </FilterChip>
                  ))}
                  {overflowTaxonomyGenres.length > 0 ? (
                    <button
                      className="whitespace-nowrap rounded-full border border-cyan-300/40 bg-cyan-300/10 px-2.5 py-1.5 text-[11px] font-semibold text-cyan-100"
                      onClick={() => setGenreSheetOpen((value) => !value)}
                      type="button"
                    >
                      + Thể loại
                    </button>
                  ) : null}
                </div>
              </div>
              {genreSheetOpen && overflowTaxonomyGenres.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 p-2">
                  {overflowTaxonomyGenres.map((genre) => (
                    <FilterChip
                      active={activeMainGenreTerm === genre.id}
                      href={buildStudioManagerHref(basePath, {
                        ...chipQuery,
                        mainGenreTerm: genre.id
                      })}
                      key={genre.id}
                    >
                      {genre.label}
                    </FilterChip>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="no-scrollbar overflow-x-auto pb-0.5">
        <div className="flex min-w-max gap-1.5">
          {STORY_TABS.map((tab) => (
            <StatusChip
              active={activeFilter === tab.value}
              href={buildStudioManagerHref(basePath, {
                ...chipQuery,
                status: tab.value === "all" ? undefined : tab.value
              })}
              key={tab.value}
            >
              {tab.label} ({counts[tab.value]})
            </StatusChip>
          ))}
        </div>
      </div>
    </div>
  );
}
