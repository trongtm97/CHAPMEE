"use client";

import Link from "next/link";
import { useState } from "react";
import { ANALYTICS_TOP_DEFAULT, ANALYTICS_TOP_MAX } from "@/lib/studio/analytics-query";
import { analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioChapterAnalytics } from "@/types/studio-analytics";

const btnCompact =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

type TopChaptersSectionProps = {
  chapters: StudioChapterAnalytics[];
};

export function TopChaptersSection({ chapters }: TopChaptersSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? ANALYTICS_TOP_MAX : ANALYTICS_TOP_DEFAULT;
  const visible = chapters.slice(0, limit);

  if (chapters.length === 0) {
    return null;
  }

  const showCompletion = visible.some((c) => c.completionRate !== null);

  return (
    <section className={`${analyticsCard} p-4`}>
      <h2 className="text-base font-bold text-white">Top chương</h2>
      <p className="mt-1 text-xs text-zinc-500">Chương giữ chân và tạo tương tác</p>

      <ul className="mt-4 space-y-2">
        {visible.map((chapter) => (
          <li
            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
            key={chapter.id}
          >
            <div className="min-w-0">
              <p className="font-semibold text-zinc-100">
                Ch.{chapter.episodeNumber}: {chapter.title}
              </p>
              <p className="text-xs text-zinc-500">{chapter.storyTitle}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span>{formatNumber(chapter.reads)} đọc</span>
                <span>{formatNumber(chapter.comments)} BL</span>
                {showCompletion && chapter.completionRate !== null ? (
                  <span>{chapter.completionRate}% hoàn thành</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link className={btnCompact} href={chapter.openHref} target="_blank">
                Mở chương
              </Link>
              <Link className={btnCompact} href={chapter.editHref}>
                Sửa
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {chapters.length > ANALYTICS_TOP_DEFAULT && !expanded ? (
        <button
          className="mt-3 text-sm font-semibold text-cyan-300"
          onClick={() => setExpanded(true)}
          type="button"
        >
          Xem thêm
        </button>
      ) : null}
    </section>
  );
}
