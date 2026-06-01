import Link from "next/link";
import { ArticleNavIcon } from "@/components/navigation/AppNavIcons";
import { listContentPosts } from "@/lib/platform-content/content-posts";import { DiscoverArticlesSection } from "@/components/discover/DiscoverArticlesSection";

export async function DiscoverArticlesBlock() {
  const { items } = await listContentPosts({
    publicOnly: true,
    limit: 5,
    sort: "published"
  });

  return <DiscoverArticlesSection items={items} />;
}

export function DiscoverArticlesQuickLink() {
  return (
    <Link
      className="tap-highlight flex min-h-[4.5rem] flex-col justify-between rounded-xl border border-white/10 bg-[var(--surface-soft)] p-2.5 transition hover:border-cyan-300/30"
      href="/bai-viet"
    >
      <span aria-hidden="true" className="text-cyan-300">
        <ArticleNavIcon className="size-4" />
      </span>      <div className="min-w-0">
        <p className="text-[13px] font-black leading-tight text-zinc-50">Bài viết</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-zinc-400">
          Hướng dẫn & tin ChapMee
        </p>
      </div>
    </Link>
  );
}
