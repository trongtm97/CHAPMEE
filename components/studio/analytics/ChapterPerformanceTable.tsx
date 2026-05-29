"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, EmptyState, SectionHeader } from "@/components/ui";
import type { StudioChapterAnalytics } from "@/lib/studio/get-studio-analytics";

type ChapterPerformanceTableProps = {
  chapters: StudioChapterAnalytics[];
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value);

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export function ChapterPerformanceTable({ chapters }: ChapterPerformanceTableProps) {
  const storyOptions = useMemo(() => {
    const map = new Map<string, string>();

    for (const chapter of chapters) {
      map.set(chapter.storyId, chapter.storyTitle);
    }

    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [chapters]);

  const [storyFilter, setStoryFilter] = useState("all");

  const filtered =
    storyFilter === "all"
      ? chapters
      : chapters.filter((chapter) => chapter.storyId === storyFilter);

  return (
    <section className="space-y-3">
      <SectionHeader title="Hiệu quả theo chương" />

      {storyOptions.length > 1 ? (
        <label className="block max-w-md space-y-1 text-sm">
          <span className="text-zinc-400">Lọc theo truyện</span>
          <select
            className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
            onChange={(event) => setStoryFilter(event.target.value)}
            value={storyFilter}
          >
            <option value="all">Tất cả truyện</option>
            {storyOptions.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState
          description="Khi chương có lượt đọc hoặc bình luận, dữ liệu sẽ hiển thị tại đây."
          title="Chưa có dữ liệu chương"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((chapter) => (
            <Card className="space-y-3 p-4" key={chapter.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-cyan-300">{chapter.storyTitle}</p>
                  <p className="mt-1 font-semibold text-white">
                    Chương {chapter.episodeNumber}: {chapter.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Đăng: {formatDate(chapter.publishedAt)}
                  </p>
                </div>
                <Link
                  className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                  href={chapter.editHref}
                >
                  Sửa chương
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Lượt đọc" value={formatNumber(chapter.reads)} />
                <Metric label="Bình luận" value={formatNumber(chapter.comments)} />
                <Metric label="Hoàn thành" value={formatNumber(chapter.completions)} />
                <Metric
                  label="Tỷ lệ đọc tiếp"
                  value={
                    chapter.completionRate === null
                      ? "Chưa có dữ liệu"
                      : `${chapter.completionRate}%`
                  }
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950/80 px-3 py-2">
      <p className="text-sm font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
