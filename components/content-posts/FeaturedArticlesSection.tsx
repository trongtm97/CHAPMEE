import { ContentPostCard } from "@/components/content-posts/ContentPostCard";
import { isContentPostFeatured } from "@/lib/content-posts/featured";
import type { AdminContentPost } from "@/types/platform-content";

type FeaturedArticlesSectionProps = {
  primary: AdminContentPost | null;
  secondary: AdminContentPost[];
};

export function FeaturedArticlesSection({ primary, secondary }: FeaturedArticlesSectionProps) {
  if (!primary) return null;

  const featuredItems = [primary, ...secondary];

  return (
    <section aria-labelledby="featured-posts-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="featured-posts-heading" className="text-sm font-bold uppercase tracking-wide text-zinc-300">
            Nên đọc trước
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Bắt đầu với những bài viết giúp bạn hiểu ChapMee nhanh hơn.
          </p>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:gap-4">
        {featuredItems.map((item) => (
          <li key={item.id}>
            <ContentPostCard
              featured={isContentPostFeatured(item)}
              item={item}
              layout="grid"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
