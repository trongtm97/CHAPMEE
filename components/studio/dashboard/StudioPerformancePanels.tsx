"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { StudioEmptyState } from "@/components/studio/dashboard/shared/StudioEmptyState";
import { studioGhostPillBtn } from "@/components/studio/dashboard/shared/styles";
import { studioPath } from "@/lib/studio/constants";
import type { StudioPerformanceSnapshot } from "@/types/creator";

type StudioPerformancePanelsProps = {
  hasStories: boolean;
  snapshot: StudioPerformanceSnapshot;
  /** Gọn hơn khi nằm cạnh cột Lịch đăng. */
  compact?: boolean;
  /** Căn chiều cao với panel bên cạnh. */
  fillHeight?: boolean;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

export function StudioPerformancePanels({
  compact = false,
  fillHeight = false,
  hasStories,
  snapshot
}: StudioPerformancePanelsProps) {
  const [showAllMobile, setShowAllMobile] = useState(false);

  if (!hasStories) {
    return (
      <StudioEmptyState bare centered title="Chưa có dữ liệu hiệu quả" />
    );
  }

  const hasData =
    snapshot.topStories.length > 0 ||
    snapshot.topChapters.length > 0 ||
    snapshot.comments > 0 ||
    snapshot.newFollowers > 0;

  if (!hasData) {
    return (
      <StudioEmptyState bare centered title="Chưa có hiệu quả gần đây" />
    );
  }

  const panels: Array<{ id: string; content: ReactNode }> = [
    {
      content: (
        <PerformancePanel title="Top truyện 7 ngày">
          {snapshot.topStories.length === 0 ? (
            <p className="text-xs text-zinc-500">Chưa có dữ liệu.</p>
          ) : (
            <ul className="space-y-1">
              {snapshot.topStories.map((story) => (
                <li key={story.id}>
                  <Link
                    className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5"
                    href={story.href}
                  >
                    <span className="line-clamp-1 text-sm text-zinc-200">
                      {story.title}
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500">
                      {formatNumber(story.reads)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PerformancePanel>
      ),
      id: "top-stories"
    },
    {
      content: (
        <PerformancePanel title="Chương được đọc nhiều">
          {snapshot.topChapters.length === 0 ? (
            <p className="text-xs text-zinc-500">Chưa có dữ liệu.</p>
          ) : (
            <ul className="space-y-1">
              {snapshot.topChapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link
                    className="block rounded-lg px-1.5 py-1 transition hover:bg-white/5"
                    href={chapter.href}
                  >
                    <p className="line-clamp-1 text-sm text-zinc-200">
                      {chapter.storyTitle} · Ch.{chapter.episodeNumber}
                    </p>
                    <p className="line-clamp-1 text-xs text-zinc-500">
                      {chapter.title} · {formatNumber(chapter.reads)} lượt đọc
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PerformancePanel>
      ),
      id: "top-chapters"
    },
    {
      content: (
        <PerformancePanel title="Bình luận & theo dõi">
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Bình luận mới" value={snapshot.comments} />
            <Metric label="Theo dõi mới" value={snapshot.newFollowers} />
          </div>
          <Link
            className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href={studioPath("/comments")}
          >
            Xem bình luận
          </Link>
        </PerformancePanel>
      ),
      id: "engagement"
    },
    {
      content: (
        <PerformancePanel title="Reels">
          {snapshot.reelsViews === null ? (
            <p className="text-xs text-zinc-500">Chưa có dữ liệu Reels.</p>
          ) : (
            <Metric label="Lượt xem Reels" value={snapshot.reelsViews} />
          )}
          <Link
            className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            href={studioPath("/reels")}
          >
            Quản lý Reels
          </Link>
        </PerformancePanel>
      ),
      id: "reels"
    }
  ];

  return (
    <div className={`space-y-2 ${fillHeight ? "flex h-full flex-col" : ""}`}>
      {compact ? (
        <Card
          className={`space-y-2 p-2.5 sm:space-y-3 sm:p-3.5 ${fillHeight ? "flex h-full flex-1 flex-col" : ""}`}
        >
          <div>
            <h3 className="text-sm font-semibold text-white">Top truyện 7 ngày</h3>
            {snapshot.topStories.length === 0 ? (
              <p className="mt-1 text-xs text-zinc-500">Chưa có dữ liệu.</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {snapshot.topStories.map((story) => (
                  <li key={story.id}>
                    <Link
                      className="flex items-center justify-between gap-2 rounded-lg px-1.5 py-1 transition hover:bg-white/5"
                      href={story.href}
                    >
                      <span className="line-clamp-1 text-sm text-zinc-200">
                        {story.title}
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                        {formatNumber(story.reads)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-white/10 pt-2 sm:pt-3">
            <h3 className="text-sm font-semibold text-white">Tương tác</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Metric compact label="Bình luận" value={snapshot.comments} />
              <Metric compact label="Theo dõi" value={snapshot.newFollowers} />
            </div>
            <Link
              className="mt-2 inline-block text-xs font-semibold text-cyan-300 hover:text-cyan-200"
              href={studioPath("/analytics")}
            >
              Xem chi tiết thống kê
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-2 md:grid-cols-2">
            {panels.map((panel, index) => (
              <div
                className={index >= 2 && !showAllMobile ? "hidden md:block" : ""}
                key={panel.id}
              >
                {panel.content}
              </div>
            ))}
          </div>

          {panels.length > 2 ? (
            <div className="flex justify-center md:hidden">
              <button
                className={studioGhostPillBtn}
                onClick={() => setShowAllMobile((value) => !value)}
                type="button"
              >
                {showAllMobile ? "Thu gọn" : "Xem thêm hiệu quả"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PerformancePanel({
  children,
  title
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Card className="space-y-2 p-3 sm:p-3.5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </Card>
  );
}

function Metric({
  compact = false,
  label,
  value
}: {
  compact?: boolean;
  label: string;
  value: number;
}) {
  return (
    <div
      className={`rounded-lg border border-white/10 bg-white/[0.02] ${
        compact ? "p-2" : "p-2.5"
      }`}
    >
      <p className={`font-black text-white ${compact ? "text-base" : "text-base sm:text-lg"}`}>
        {formatNumber(value)}
      </p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

/** @deprecated Use StudioPerformancePanels */
export const StudioPerformanceSnapshotSection = StudioPerformancePanels;
