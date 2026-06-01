"use client";

import Link from "next/link";
import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { StudioManagerTabs } from "@/components/studio/StudioManagerTabs";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import {
  DRAFT_LIST_PAGE_SIZE_DEFAULT,
  type DraftListPageSize,
  type DraftSort,
  type DraftStatusFilter,
  type DraftTimeFilter,
  type StudioDraftListFilter
} from "@/types/drafts";
import {
  draftsBtnPrimary,
  draftsBtnSecondary
} from "@/components/studio/drafts/shared/styles";

type StudioDraftsFiltersProps = {
  activeFilter: StudioDraftListFilter;
  activePageSize: DraftListPageSize;
  activeSort: DraftSort;
  activeStatus: DraftStatusFilter;
  activeTime: DraftTimeFilter;
  basePath: string;
  counts: Record<StudioDraftListFilter, number>;
  query: Record<string, string | undefined>;
  search: string;
};

const TYPE_TABS: Array<{ label: string; value: StudioDraftListFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Truyện", value: "story" },
  { label: "Nội dung một phần", value: "standalone_content" },
  { label: "Chương", value: "chapter" },
  { label: "Reels", value: "reels" },
  { label: "SEO", value: "seo" }
];

const STATUS_OPTIONS: Array<{ label: string; value: DraftStatusFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Đang viết", value: "writing" },
  { label: "Chưa hoàn tất", value: "incomplete" },
  { label: "Sẵn sàng xuất bản", value: "ready" },
  { label: "Có lỗi / thiếu thông tin", value: "has_errors" },
  { label: "Nháp cũ", value: "stale" }
];

const TIME_OPTIONS: Array<{ label: string; value: DraftTimeFilter }> = [
  { label: "Mới cập nhật", value: "recent" },
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Cũ hơn 30 ngày", value: "older" }
];

const SORT_OPTIONS: Array<{ label: string; value: DraftSort }> = [
  { label: "Cập nhật gần nhất", value: "updated" },
  { label: "Cập nhật cũ nhất", value: "updated_asc" },
  { label: "Tên A-Z", value: "title" },
  { label: "Loại nội dung", value: "type" },
  { label: "Mức độ ưu tiên", value: "priority" }
];

const PAGE_SIZE_OPTIONS: DraftListPageSize[] = [10, 25, 50];

function FilterChip({
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

export function StudioDraftsFilters({
  activeFilter,
  activePageSize,
  activeSort,
  activeStatus,
  activeTime,
  basePath,
  counts,
  query,
  search
}: StudioDraftsFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3 sm:p-4">
      <form action={basePath} className="space-y-3" method="get">
        <AppSearchField
          defaultValue={search}
          placeholder="Tiêu đề, truyện hoặc nội dung nháp..."
          variant="field"
        />

        {activeFilter !== "all" ? (
          <input name="type" type="hidden" value={activeFilter} />
        ) : null}
        {activeStatus !== "all" ? (
          <input name="status" type="hidden" value={activeStatus} />
        ) : null}
        {activeTime !== "all" ? (
          <input name="time" type="hidden" value={activeTime} />
        ) : null}
        {activeSort !== "updated" ? (
          <input name="sort" type="hidden" value={activeSort} />
        ) : null}
        {activePageSize !== DRAFT_LIST_PAGE_SIZE_DEFAULT ? (
          <input name="size" type="hidden" value={String(activePageSize)} />
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button className={draftsBtnPrimary} type="submit">
            Tìm kiếm
          </button>
          <Link className={draftsBtnSecondary} href={basePath}>
            Xóa lọc
          </Link>
          <button
            className={draftsBtnSecondary}
            onClick={() => setExpanded((value) => !value)}
            type="button"
          >
            {expanded ? "Thu gọn bộ lọc" : "Mở rộng bộ lọc"}
          </button>
        </div>
      </form>

      <StudioManagerTabs
        active={activeFilter}
        basePath={basePath}
        counts={counts}
        filterParam="type"
        query={query}
        tabs={TYPE_TABS}
      />

      {expanded ? (
        <div className="space-y-3 border-t border-white/5 pt-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Trạng thái
            </p>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-1.5">
                {STATUS_OPTIONS.map((option) => (
                  <FilterChip
                    active={activeStatus === option.value}
                    href={buildStudioManagerHref(basePath, {
                      ...query,
                      page: undefined,
                      status: option.value === "all" ? undefined : option.value
                    })}
                    key={option.value}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Thời gian
            </p>
            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-max gap-1.5">
                <FilterChip
                  active={activeTime === "all"}
                  href={buildStudioManagerHref(basePath, {
                    ...query,
                    page: undefined,
                    time: undefined
                  })}
                >
                  Tất cả
                </FilterChip>
                {TIME_OPTIONS.map((option) => (
                  <FilterChip
                    active={activeTime === option.value}
                    href={buildStudioManagerHref(basePath, {
                      ...query,
                      page: undefined,
                      time: option.value
                    })}
                    key={option.value}
                  >
                    {option.label}
                  </FilterChip>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-semibold text-zinc-400">Sắp xếp</span>
              <select
                className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
                onChange={(event) => {
                  window.location.href = buildStudioManagerHref(basePath, {
                    ...query,
                    page: undefined,
                    sort:
                      event.target.value === "updated"
                        ? undefined
                        : event.target.value
                  });
                }}
                value={activeSort}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="text-xs font-semibold text-zinc-400">Số mục/trang</span>
              <select
                className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-zinc-100"
                onChange={(event) => {
                  const size = event.target.value;
                  window.location.href = buildStudioManagerHref(basePath, {
                    ...query,
                    page: undefined,
                    size: size === String(DRAFT_LIST_PAGE_SIZE_DEFAULT) ? undefined : size
                  });
                }}
                value={String(activePageSize)}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
