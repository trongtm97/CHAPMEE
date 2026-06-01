import Link from "next/link";
import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import type { AdminContentPost } from "@/types/platform-content";

type DiscoverArticlesSectionProps = {
  items: AdminContentPost[];
};

export function DiscoverArticlesSection({ items }: DiscoverArticlesSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-zinc-50 md:text-lg">Bài viết từ ChapMee</h2>
          <p className="mt-0.5 text-xs text-zinc-400">Hướng dẫn, tin tức và mẹo đọc truyện.</p>
        </div>
        <Link
          className="shrink-0 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          href="/bai-viet"
        >
          Xem tất cả
        </Link>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <ContentPostCard compact item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
