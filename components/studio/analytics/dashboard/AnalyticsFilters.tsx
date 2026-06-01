"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppSearchField } from "@/components/ui/AppSearchField";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import {
  analyticsBtnPrimary,
  analyticsBtnSecondary,
  analyticsCard,
  analyticsInput
} from "@/components/studio/analytics/dashboard/shared/styles";
import type {
  StudioAnalyticsContentFilter,
  StudioAnalyticsRange,
  StudioAnalyticsStoryOption
} from "@/types/studio-analytics";

type AnalyticsFiltersProps = {
  activeContent: StudioAnalyticsContentFilter;
  activeRange: StudioAnalyticsRange;
  activeStoryId?: string;
  basePath: string;
  query: Record<string, string | undefined>;
  search: string;
  stories: StudioAnalyticsStoryOption[];
};

const RANGE_OPTIONS: Array<{ label: string; value: StudioAnalyticsRange }> = [
  { label: "Hôm nay", value: "today" },
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "Tháng này", value: "month" },
  { label: "Tất cả", value: "all" }
];

const CONTENT_OPTIONS: Array<{ label: string; value: StudioAnalyticsContentFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Truyện", value: "story" },
  { label: "Chương", value: "chapter" },
  { label: "Reels", value: "reels" },
  { label: "Bình luận", value: "comments" }
];

export function AnalyticsFilters({
  activeContent,
  activeRange,
  activeStoryId,
  basePath,
  query,
  search,
  stories
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(search);
  const [draftStory, setDraftStory] = useState(activeStoryId ?? "");
  const [draftContent, setDraftContent] = useState(activeContent);
  const [draftRange, setDraftRange] = useState(activeRange);

  function apply() {
    router.push(
      buildStudioManagerHref(basePath, {
        ...query,
        content: draftContent !== "all" ? draftContent : undefined,
        q: localSearch.trim() || undefined,
        range: draftRange !== "30d" ? draftRange : undefined,
        story: draftStory || undefined
      })
    );
  }

  function clear() {
    router.push(basePath);
  }

  return (
    <div className={`${analyticsCard} space-y-4 p-4 lg:sticky lg:top-4 lg:z-20`}>
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((option) => {
          const active = activeRange === option.value;
          return (
            <Link
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-zinc-400 hover:border-white/20"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                range: option.value !== "30d" ? option.value : undefined
              })}
              key={option.value}
            >
              {option.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden gap-3 lg:grid lg:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Truyện</span>
          <select
            className={analyticsInput}
            onChange={(event) => setDraftStory(event.target.value)}
            value={draftStory}
          >
            <option value="">Tất cả truyện</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Loại nội dung</span>
          <select
            className={analyticsInput}
            onChange={(event) =>
              setDraftContent(event.target.value as StudioAnalyticsContentFilter)
            }
            value={draftContent}
          >
            {CONTENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-500">Tìm kiếm</span>
          <AppSearchField
            onChange={setLocalSearch}
            placeholder="Tìm truyện, chương..."
            showSubmit={false}
            value={localSearch}
            variant="field"
          />
        </label>
      </div>

      <div className="hidden flex-wrap gap-2 lg:flex">
        <button className={analyticsBtnPrimary} onClick={apply} type="button">
          Áp dụng
        </button>
        <button className={analyticsBtnSecondary} onClick={clear} type="button">
          Xóa lọc
        </button>
      </div>

      <div className="lg:hidden">
        <button
          className={`${analyticsBtnSecondary} w-full`}
          onClick={() => setMobileOpen((open) => !open)}
          type="button"
        >
          {mobileOpen ? "Đóng bộ lọc" : "Bộ lọc"}
        </button>
        {mobileOpen ? (
          <div className="mt-3 space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Truyện</span>
              <select
                className={analyticsInput}
                onChange={(event) => setDraftStory(event.target.value)}
                value={draftStory}
              >
                <option value="">Tất cả truyện</option>
                {stories.map((story) => (
                  <option key={story.id} value={story.id}>
                    {story.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Loại nội dung</span>
              <select
                className={analyticsInput}
                onChange={(event) =>
                  setDraftContent(event.target.value as StudioAnalyticsContentFilter)
                }
                value={draftContent}
              >
                {CONTENT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <AppSearchField
              onChange={setLocalSearch}
              placeholder="Tìm truyện, chương..."
              showSubmit={false}
              value={localSearch}
              variant="field"
            />
            <label className="block space-y-1">
              <span className="text-xs text-zinc-500">Khoảng thời gian</span>
              <select
                className={analyticsInput}
                onChange={(event) =>
                  setDraftRange(event.target.value as StudioAnalyticsRange)
                }
                value={draftRange}
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button className={analyticsBtnPrimary} onClick={apply} type="button">
                Áp dụng
              </button>
              <button className={analyticsBtnSecondary} onClick={clear} type="button">
                Xóa lọc
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-zinc-600 lg:hidden">
        <Link className="text-cyan-300" href={studioPath("/stories")}>
          Quản lý truyện
        </Link>
      </p>
    </div>
  );
}
