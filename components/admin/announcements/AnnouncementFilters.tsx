"use client";

import { useState } from "react";
import {
  ANNOUNCEMENT_AUDIENCE_FILTER_OPTIONS,
  ANNOUNCEMENT_SEO_FILTER_OPTIONS,
  ANNOUNCEMENT_SORT_OPTIONS,
  ANNOUNCEMENT_STATUS_FILTER_OPTIONS,
  ANNOUNCEMENT_TYPE_FILTER_OPTIONS,
  ANNOUNCEMENT_VISIBILITY_FILTER_OPTIONS,
  countActiveAnnouncementFilters
} from "@/lib/platform-content/parse-announcement-filters";
import type { AnnouncementListFilters } from "@/lib/platform-content/parse-announcement-filters";

type Props = {
  filters: AnnouncementListFilters;
  searchInput: string;
  pending?: boolean;
  onSearchInputChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  onChange: (patch: Partial<AnnouncementListFilters>) => void;
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

export function AnnouncementFilters({
  filters,
  searchInput,
  pending,
  onSearchInputChange,
  onApply,
  onReset,
  onChange
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveAnnouncementFilters(filters);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950/60">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 lg:hidden">
        <button
          className="text-sm font-medium text-zinc-200"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button
          className="text-xs text-cyan-300"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
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
              placeholder="Tìm theo tiêu đề, slug, nội dung…"
              value={searchInput}
            />
          </label>

          <label className="w-full space-y-1 lg:w-44">
            <span className="text-xs text-zinc-500">Sắp xếp</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(event) =>
                onChange({ sort: event.target.value as AnnouncementListFilters["sort"], page: 1 })
              }
              value={filters.sort}
            >
              {ANNOUNCEMENT_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <button
              className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 disabled:opacity-60"
              disabled={pending}
              onClick={onApply}
              type="button"
            >
              Áp dụng
            </button>
            <button
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
              disabled={pending}
              onClick={onReset}
              type="button"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <FilterGroup title="Trạng thái">
          {ANNOUNCEMENT_STATUS_FILTER_OPTIONS.map((option) => (
            <FilterChip
              active={filters.status === option.value}
              key={option.value}
              label={option.label}
              onClick={() =>
                onChange({
                  status: option.value as AnnouncementListFilters["status"],
                  page: 1
                })
              }
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Loại thông báo">
          {ANNOUNCEMENT_TYPE_FILTER_OPTIONS.map((option) => (
            <FilterChip
              active={filters.announcementType === option.value}
              key={option.value}
              label={option.label}
              onClick={() =>
                onChange({
                  announcementType: option.value as AnnouncementListFilters["announcementType"],
                  page: 1
                })
              }
            />
          ))}
        </FilterGroup>

        <div className="grid gap-4 lg:grid-cols-3">
          <FilterGroup title="Đối tượng">
            {ANNOUNCEMENT_AUDIENCE_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.audience === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    audience: option.value as AnnouncementListFilters["audience"],
                    page: 1
                  })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="Hiển thị">
            {ANNOUNCEMENT_VISIBILITY_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.visibility === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    visibility: option.value as AnnouncementListFilters["visibility"],
                    page: 1
                  })
                }
              />
            ))}
          </FilterGroup>

          <FilterGroup title="SEO / Index">
            {ANNOUNCEMENT_SEO_FILTER_OPTIONS.map((option) => (
              <FilterChip
                active={filters.seo === option.value}
                key={option.value}
                label={option.label}
                onClick={() =>
                  onChange({
                    seo: option.value as AnnouncementListFilters["seo"],
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
