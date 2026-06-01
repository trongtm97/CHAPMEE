"use client";

import Link from "next/link";
import { useState } from "react";
import { ANALYTICS_TOP_DEFAULT, ANALYTICS_TOP_MAX } from "@/lib/studio/analytics-query";
import { analyticsCard } from "@/components/studio/analytics/dashboard/shared/styles";
import { ShowMoreLink } from "@/components/studio/analytics/dashboard/ShowMoreLink";
import { studioPath } from "@/lib/studio/constants";
import type { StudioStoryAnalytics } from "@/types/studio-analytics";

const btnCompact =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/5";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

type TopStoriesSectionProps = {
  stories: StudioStoryAnalytics[];
};

export function TopStoriesSection({ stories }: TopStoriesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? ANALYTICS_TOP_MAX : ANALYTICS_TOP_DEFAULT;
  const visible = stories.slice(0, limit);

  if (stories.length === 0) {
    return null;
  }

  return (
    <section className={`${analyticsCard} p-4`}>
      <h2 className="text-base font-bold text-white">Top truyện</h2>
      <p className="mt-1 text-xs text-zinc-500">Theo lượt đọc và tương tác trong kỳ</p>

      <div className="mt-4 hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-zinc-500">
              <th className="pb-2 font-medium">Truyện</th>
              <th className="pb-2 font-medium">Trạng thái</th>
              <th className="pb-2 font-medium">Thể loại</th>
              <th className="pb-2 font-medium">Đọc</th>
              <th className="pb-2 font-medium">Lưu</th>
              <th className="pb-2 font-medium">BL</th>
              <th className="pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((story) => (
              <tr className="border-b border-white/5" key={story.id}>
                <td className="py-2.5 font-semibold text-zinc-100">{story.title}</td>
                <td className="py-2.5 text-zinc-400">{story.displayStatus}</td>
                <td className="py-2.5 text-zinc-500">{story.genreLabel ?? "—"}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(story.reads)}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(story.saves)}</td>
                <td className="py-2.5 tabular-nums">{formatNumber(story.comments)}</td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <Link className={btnCompact} href={story.studioHref}>
                      Chi tiết
                    </Link>
                    <Link className={btnCompact} href={story.chaptersHref}>
                      Chương
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="mt-4 space-y-2 lg:hidden">
        {visible.map((story) => (
          <li
            className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            key={story.id}
          >
            <p className="font-semibold text-white">{story.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {story.displayStatus}
              {story.genreLabel ? ` · ${story.genreLabel}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
              <span>{formatNumber(story.reads)} đọc</span>
              <span>{formatNumber(story.saves)} lưu</span>
              <span>{formatNumber(story.comments)} BL</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link className={`${btnCompact} flex-1`} href={story.studioHref}>
                Chi tiết
              </Link>
              <Link className={`${btnCompact} flex-1`} href={story.chaptersHref}>
                Chương
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {stories.length > ANALYTICS_TOP_DEFAULT && !expanded ? (
        <button
          className="mt-3 text-sm font-semibold text-cyan-300"
          onClick={() => setExpanded(true)}
          type="button"
        >
          Xem thêm ({stories.length - ANALYTICS_TOP_DEFAULT})
        </button>
      ) : null}

      <ShowMoreLink href={studioPath("/stories")} label="Quản lý tất cả truyện" />
    </section>
  );
}
