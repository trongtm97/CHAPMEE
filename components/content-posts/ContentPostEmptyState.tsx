import Link from "next/link";
import { CONTENT_HUB_TOPIC_LINKS } from "@/lib/content-posts/public-catalog";

type ContentPostEmptyStateProps = {
  variant?: "no-results" | "updating";
  showSuggestedTopics?: boolean;
  hasActiveFilters?: boolean;
};

export function ContentPostEmptyState({
  variant = "no-results",
  showSuggestedTopics = true,
  hasActiveFilters = false
}: ContentPostEmptyStateProps) {
  const isUpdating = variant === "updating";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-10 text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-pink-500/10 text-2xl"
        >
          {isUpdating ? "✦" : "⌕"}
        </div>
        <h2 className="text-lg font-bold text-zinc-100">
          {isUpdating ? "Bài viết đang được cập nhật" : "Chưa tìm thấy bài viết phù hợp"}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          {isUpdating
            ? "Đội ngũ ChapMee đang chuẩn bị hướng dẫn và bài viết mới. Quay lại sau hoặc khám phá các mục khác trên nền tảng."
            : "Thử đổi từ khóa, bỏ bộ lọc hoặc quay lại tất cả bài viết."}
        </p>
        {!isUpdating ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              href="/bai-viet"
            >
              {hasActiveFilters ? "Xóa bộ lọc" : "Xem tất cả"}
            </Link>
            <Link
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
              href="/discover"
            >
              Khám phá truyện
            </Link>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="inline-flex rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400"
              href="/discover"
            >
              Khám phá ChapMee
            </Link>
            <Link
              className="inline-flex rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-white/25"
              href="/reels"
            >
              Xem Reels
            </Link>
          </div>
        )}
      </div>

      {showSuggestedTopics ? (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-zinc-200">Chủ đề gợi ý</h2>
          <p className="text-xs text-zinc-500">
            Bắt đầu với những bài viết giúp bạn hiểu ChapMee nhanh hơn.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {CONTENT_HUB_TOPIC_LINKS.map((topic) => (
              <li key={topic.href}>
                <Link
                  className="block rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 transition hover:border-cyan-300/30 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                  href={topic.href}
                >
                  <span className="text-sm font-semibold text-zinc-100">{topic.label}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{topic.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
