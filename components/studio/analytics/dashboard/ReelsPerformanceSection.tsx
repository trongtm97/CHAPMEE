"use client";

import Link from "next/link";
import { useState } from "react";
import { ANALYTICS_TOP_DEFAULT, ANALYTICS_TOP_MAX } from "@/lib/studio/analytics-query";
import {
  analyticsBtnPrimary,
  analyticsCard
} from "@/components/studio/analytics/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type {
  StudioReelsAnalytics,
  StudioReelsPeriodSummary
} from "@/types/studio-analytics";

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

const STATUS_LABEL: Record<string, string> = {
  draft: "Nháp",
  hidden: "Đã ẩn",
  published: "Đã đăng",
  rejected: "Cần sửa",
  scheduled: "Đã lên lịch"
};

type ReelsPerformanceSectionProps = {
  reels: StudioReelsAnalytics[];
  summary: StudioReelsPeriodSummary;
};

export function ReelsPerformanceSection({
  reels,
  summary
}: ReelsPerformanceSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? ANALYTICS_TOP_MAX : ANALYTICS_TOP_DEFAULT;
  const visible = reels.slice(0, limit);

  if (reels.length === 0) {
    return (
      <section className={`${analyticsCard} border-dashed p-6 text-center`}>
        <p className="text-base font-semibold text-white">Chưa có Reels</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Tạo Reels từ chương nổi bật để kéo độc giả vào truyện.
        </p>
        <Link
          className={`${analyticsBtnPrimary} mt-4 inline-flex`}
          href={studioPath("/reels/new")}
        >
          Tạo Reels mới
        </Link>
      </section>
    );
  }

  return (
    <section className={`${analyticsCard} p-4`}>
      <h2 className="text-base font-bold text-white">Hiệu quả Reels</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
          <p className="text-lg font-bold text-white">{summary.publishedCount}</p>
          <p className="text-[10px] text-zinc-500">Đã đăng (kỳ)</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
          <p className="text-lg font-bold text-white">{formatNumber(summary.totalViews)}</p>
          <p className="text-[10px] text-zinc-500">Lượt xem</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-2">
          <p className="text-lg font-bold text-white">{formatNumber(summary.ctaClicks)}</p>
          <p className="text-[10px] text-zinc-500">Chuyển đọc</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {visible.map((reel) => (
          <li
            className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
            key={reel.id}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold text-white">{reel.hook}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {reel.storyTitle} · {reel.chapterLabel}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                {STATUS_LABEL[reel.status] ?? reel.status}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-400">
              <span>{formatNumber(reel.views)} xem</span>
              <span>{formatNumber(reel.ctaClicks)} CTA</span>
              {reel.ctaRate !== null ? <span>{reel.ctaRate}% CTR</span> : null}
            </div>
            <Link
              className="mt-2 inline-flex text-xs font-semibold text-cyan-300"
              href={reel.editHref}
            >
              Sửa Reels
            </Link>
          </li>
        ))}
      </ul>

      {reels.length > ANALYTICS_TOP_DEFAULT && !expanded ? (
        <button
          className="mt-3 text-sm font-semibold text-cyan-300"
          onClick={() => setExpanded(true)}
          type="button"
        >
          Xem thêm
        </button>
      ) : null}

      <Link
        className="mt-3 inline-flex text-sm font-semibold text-cyan-300"
        href={studioPath("/reels")}
      >
        Quản lý tất cả Reels
      </Link>
    </section>
  );
}
