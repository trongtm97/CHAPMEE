"use client";

import { useState } from "react";
import {
  CONTENT_POST_DATE_RANGE_OPTIONS,
  CONTENT_POST_INDEX_FILTER_OPTIONS,
  CONTENT_POST_SEO_FILTER_OPTIONS,
  CONTENT_POST_SORT_OPTIONS,
  CONTENT_POST_STATUS_FILTER_OPTIONS,
  CONTENT_POST_TYPE_FILTER_OPTIONS,
  countActiveContentPostFilters
} from "@/lib/platform-content/parse-post-filters";
import type { ContentPostListFilters } from "@/lib/platform-content/parse-post-filters";

type Props = {
  filters: ContentPostListFilters;
  searchInput: string;
  pending?: boolean;
  onSearchInputChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (patch: Partial<ContentPostListFilters>) => void;
};

function FilterChip({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-zinc-950/80 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function ContentPostFilters({
  filters,
  searchInput,
  pending,
  onSearchInputChange,
  onApply,
  onReset,
  onChange
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveContentPostFilters(filters);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 lg:hidden">
        <button className="text-sm font-medium text-zinc-200" onClick={() => setExpanded((v) => !v)} type="button">
          Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button className="text-xs text-cyan-300" onClick={() => setExpanded((v) => !v)} type="button">
          {expanded ? "Thu gọn" : "Mở rộng"}
        </button>
      </div>

      <div className={`space-y-4 p-4 ${expanded ? "block" : "hidden lg:block"}`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-xs text-zinc-500">Tìm kiếm</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onApply();
              }}
              placeholder="Tìm theo tiêu đề, slug, excerpt, nội dung…"
              value={searchInput}
            />
          </label>
          <label className="w-full space-y-1 lg:w-44">
            <span className="text-xs text-zinc-500">Sắp xếp</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({ sort: event.target.value as ContentPostListFilters["sort"], page: 1 })
              }
              value={filters.sort}
            >
              {CONTENT_POST_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-60"
              disabled={pending}
              onClick={onApply}
              type="button"
            >
              Áp dụng
            </button>
            <button
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
              disabled={pending}
              onClick={onReset}
              type="button"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <FilterGroup title="Trạng thái">
          {CONTENT_POST_STATUS_FILTER_OPTIONS.map((option) => (
            <FilterChip
              active={filters.status === option.value}
              key={option.value}
              label={option.label}
              onClick={() =>
                onChange({ status: option.value as ContentPostListFilters["status"], page: 1 })
              }
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Loại bài">
          {CONTENT_POST_TYPE_FILTER_OPTIONS.map((option) => (
            <FilterChip
              active={filters.postType === option.value}
              key={option.value}
              label={option.label}
              onClick={() =>
                onChange({ postType: option.value as ContentPostListFilters["postType"], page: 1 })
              }
            />
          ))}
        </FilterGroup>

        <div className="grid gap-4 lg:grid-cols-3">
          <FilterGroup title="Index">
            {CONTENT_POST_INDEX_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.indexFilter === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    indexFilter: option.value as ContentPostListFilters["indexFilter"],
                    page: 1
                  })
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup title="SEO status">
            {CONTENT_POST_SEO_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.seoFilter === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    seoFilter: option.value as ContentPostListFilters["seoFilter"],
                    page: 1
                  })
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup title="Thời gian">
            {CONTENT_POST_DATE_RANGE_OPTIONS.map((option) => (
              <FilterChip
                active={filters.dateRange === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    dateRange: option.value as ContentPostListFilters["dateRange"],
                    page: 1
                  })
                }
              />
            ))}
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}
