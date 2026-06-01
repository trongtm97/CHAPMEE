"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioStoryAttentionFilter,
  StudioStoryAttentionItem
} from "@/types/studio-stories";
import {
  storiesBtnCompactPrimary,
  storiesBtnCompactSecondary,
  storiesBtnGhost,
  storiesMobileActionGrid
} from "@/components/studio/stories/shared/styles";

const VISIBLE_LIMIT = 5;

const FILTER_OPTIONS: Array<{ label: string; value: StudioStoryAttentionFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Thiếu ảnh bìa", value: "missing_cover" },
  { label: "Cần sửa", value: "needs_fix" },
  { label: "Chưa có chương", value: "no_chapters" },
  { label: "Chưa có mô tả", value: "missing_description" }
];

function matchesFilter(
  item: StudioStoryAttentionItem,
  filter: StudioStoryAttentionFilter
) {
  switch (filter) {
    case "missing_cover":
      return item.kind === "missing_cover";
    case "needs_fix":
      return item.kind === "quality_warning";
    case "no_chapters":
      return item.kind === "no_chapters";
    case "missing_description":
      return item.kind === "missing_description";
    default:
      return true;
  }
}

type StudioStoriesAttentionProps = {
  items: StudioStoryAttentionItem[];
};

export function StudioStoriesAttention({ items }: StudioStoriesAttentionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filter, setFilter] = useState<StudioStoryAttentionFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [filter, items]
  );

  if (items.length === 0) {
    return null;
  }

  const visible = showAll ? filtered : filtered.slice(0, VISIBLE_LIMIT);
  const remaining = Math.max(0, filtered.length - VISIBLE_LIMIT);
  const basePath = studioPath("/stories");

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-white sm:text-base">Cần xử lý</h2>
          <p className="text-xs text-zinc-400">
            {items.length} việc cần xử lý — hiển thị tối đa {VISIBLE_LIMIT} ưu tiên.
          </p>
        </div>
        <button
          className={`${storiesBtnGhost} shrink-0 sm:w-auto`}
          onClick={() => setCollapsed((value) => !value)}
          type="button"
        >
          {collapsed ? "Mở rộng" : "Thu gọn"}
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTER_OPTIONS.map((option) => (
              <button
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  filter === option.value
                    ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                }`}
                key={option.value}
                onClick={() => {
                  setFilter(option.value);
                  setShowAll(false);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Không có việc trong nhóm này.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {visible.map((item) => (
                <li key={item.id}>
                  <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-semibold text-white">
                        {item.storyTitle}
                      </p>
                      <p className="text-xs text-zinc-400">{item.label}</p>
                    </div>
                    <div className={storiesMobileActionGrid}>
                      {item.secondaryHref && item.secondaryLabel ? (
                        <Link
                          className={storiesBtnCompactSecondary}
                          href={item.secondaryHref}
                        >
                          {item.secondaryLabel}
                        </Link>
                      ) : null}
                      <Link
                        className={`${storiesBtnCompactPrimary} ${
                          item.secondaryHref ? "" : "col-span-2 sm:col-span-1"
                        }`}
                        href={item.href}
                      >
                        {item.ctaLabel}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!showAll && remaining > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>Còn {remaining} việc cần xử lý</span>
              <button
                className="font-semibold text-cyan-300 hover:text-cyan-200"
                onClick={() => setShowAll(true)}
                type="button"
              >
                Xem tất cả
              </button>
            </div>
          ) : null}

          {showAll && filtered.length > VISIBLE_LIMIT ? (
            <div className="mt-2">
              <Link
                className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                href={buildStudioManagerHref(basePath, {
                  sort: "needs_attention",
                  status: filter === "missing_cover" ? "missing_cover" : undefined
                })}
              >
                Mở danh sách đã lọc theo cần xử lý
              </Link>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
