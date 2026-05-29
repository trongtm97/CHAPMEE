import Link from "next/link";
import { Card, SectionHeader } from "@/components/ui";
import { StoryCover } from "@/components/stories/StoryCover";
import type { HomeStory } from "@/lib/stories/getHomeStories";

type FeaturedStorySectionProps = {
  story: HomeStory | null;
};

export function FeaturedStorySection({ story }: FeaturedStorySectionProps) {
  if (!story) {
    return null;
  }

  return (
    <section className="space-y-3">
      <SectionHeader
        subtitle="Mỗi ngày một lựa chọn đáng dừng lại lâu hơn một chút."
        title="Lựa chọn nổi bật"
      />
      <Card className="space-y-4 border-cyan-300/20 bg-[linear-gradient(180deg,rgba(18,24,33,0.98),rgba(18,24,33,0.9))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.32)] sm:space-y-5 sm:p-5">
        <div className="space-y-4">
          <StoryCover
            coverUrl={story.coverUrl}
            genreName={story.genreName}
            genreSlug={story.genreSlug}
            size="featured"
            title={story.title}
          />

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-cyan-200">
              Top pick
            </span>
            {story.genreName ? (
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
                {story.genreName}
              </span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-zinc-300">
              {story.episodeCount} chap
            </span>
          </div>

          <div className="space-y-3">
            <h3 className="text-[1.45rem] font-black leading-8 tracking-normal text-white sm:text-[1.8rem] sm:leading-10">
              {story.title}
            </h3>
            <p className="max-w-2xl text-[0.98rem] leading-7 text-zinc-200 sm:text-[1.05rem]">
              {story.hook ?? "Một câu chuyện đang chờ bạn mở ra."}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 text-[0.95rem]">
            <span className="font-medium text-zinc-300">
              {story.creatorName ?? "Tác giả ChapMee"}
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_14px_30px_rgba(103,232,249,0.18)] transition hover:bg-cyan-200"
              href={`/stories/${story.slug}`}
            >
              Đọc ngay
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-[0.95rem] font-black uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20 hover:bg-white/[0.08]"
              href={`/stories/${story.slug}`}
            >
              Xem chi tiết
            </Link>
          </div>
        </div>
      </Card>
    </section>
  );
}
