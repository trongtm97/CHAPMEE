import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { StoryCover } from "@/components/stories/StoryCover";
import { HomeEmptyState } from "@/components/home/HomeEmptyState";
import type { ContinueReadingItem } from "@/lib/reading/getContinueReading";

type ContinueReadingSectionProps = {
  items: ContinueReadingItem[];
};

export function ContinueReadingSection({
  items
}: ContinueReadingSectionProps) {
  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Tiếp tục đúng chỗ bạn đã dừng, không cần tìm lại chap."
        title="Đọc tiếp"
      />
      {items.length === 0 ? (
        <HomeEmptyState description="Bắt đầu đọc một chap, ChapMee sẽ lưu tiến độ cho bạn." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link
              href={`/stories/${item.story.slug}/episodes/${item.episode.episodeNumber}`}
              key={item.id}
            >
              <Card className="space-y-4 border-white/8 bg-white/[0.035] transition hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-[var(--surface-soft)]">
                <div className="flex items-start gap-3">
                  <StoryCover
                    className="shrink-0"
                    coverUrl={item.story.coverUrl}
                    genreName={item.story.genreName}
                    size="small"
                    title={item.story.title}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold leading-6 text-white sm:text-[1.05rem]">
                          {item.story.title}
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400 sm:text-[0.95rem]">
                          Chap {item.episode.episodeNumber}: {item.episode.title}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
                        {item.progressPercent}%
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-300">
                      {item.story.hook ?? "Tiếp tục đúng mạch truyện bạn đang đọc."}
                    </p>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-100"
                    style={{ width: `${item.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-500">
                    {item.progressPercent}% hoàn thành
                  </p>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
                    Tiếp tục đọc
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
