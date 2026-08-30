import Link from "next/link";
import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import { getPublicPostTypeLabel } from "@/lib/content-posts/public-catalog";
import type { AdminContentPost } from "@/types/platform-content";

export function ContentPostDetailMeta({
  item,
  readingMinutes
}: {
  item: AdminContentPost;
  readingMinutes: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
        {getPublicPostTypeLabel(item.post_type)}
      </span>
      {item.category ? (
        <span className="text-xs uppercase tracking-wide text-zinc-500">{item.category}</span>
      ) : null}
      <span>ChapMee</span>
      {item.published_at ? (
        <time dateTime={item.published_at}>
          Đăng {new Date(item.published_at).toLocaleDateString("vi-VN")}
        </time>
      ) : null}
      {item.updated_at && item.updated_at !== item.published_at ? (
        <time dateTime={item.updated_at}>
          Cập nhật {new Date(item.updated_at).toLocaleDateString("vi-VN")}
        </time>
      ) : null}
      <span>{readingMinutes} phút đọc</span>
      <span>{(item.view_count ?? 0).toLocaleString("vi-VN")} lượt xem</span>
    </div>
  );
}

export function ContentPostDetailCta() {
  return (
    <section
      aria-labelledby="post-cta-heading"
      className="rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-950 to-cyan-950/20 p-5"
    >
      <h2 id="post-cta-heading" className="text-sm font-bold text-zinc-200">
        Tiếp tục trên ChapMee
      </h2>
      <p className="mt-1 text-sm text-zinc-500">Khám phá nội dung giải trí text trên nền tảng.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          href="/reels"
        >
          Khám phá Reels
        </Link>
        <Link
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          href="/truyen-sang-tac"
        >
          Xem truyện sáng tác
        </Link>
        <Link
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          href="/studio/setup"
        >
          Bắt đầu viết truyện
        </Link>
      </div>
    </section>
  );
}

export function ContentPostRelatedSection({ related }: { related: AdminContentPost[] }) {
  if (related.length === 0) return null;

  return (
    <section aria-labelledby="related-posts-heading" className="space-y-4 border-t border-white/10 pt-8">
      <h2 id="related-posts-heading" className="text-lg font-bold text-zinc-100">
        Bài viết liên quan
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {related.map((row) => (
          <li key={row.id}>
            <ContentPostCard compact item={row} layout="grid" />
          </li>
        ))}
      </ul>
    </section>
  );
}
