import Link from "next/link";
import { ContentPostTypeBadge } from "@/components/admin/content-posts/ContentPostStatusBadge";
import { estimateReadingMinutes } from "@/lib/content-posts/public-catalog";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { getContentPostUrl } from "@/lib/urls/paths";
import type { AdminContentPost } from "@/types/platform-content";

type ContentPostCardProps = {
  item: AdminContentPost;
  compact?: boolean;
};

export function ContentPostCard({ item, compact = false }: ContentPostCardProps) {
  const href =
    item.public_code != null
      ? getContentPostUrl({ slug: item.slug, public_code: item.public_code })
      : `/bai-viet/${item.slug}`;
  const excerpt =
    item.excerpt?.trim() || createExcerpt(item.content ?? "", 20, compact ? 24 : 40);
  const readingMinutes = estimateReadingMinutes(item.content ?? item.excerpt ?? "");

  return (
    <Link
      className={`group block rounded-xl border border-border transition hover:border-cyan-300/30 hover:bg-muted/20 ${
        compact ? "p-3" : "p-4 md:p-5"
      }`}
      href={href}
    >
      <article className={`flex gap-3 ${item.cover_image_url && !compact ? "md:gap-4" : ""}`}>
        {item.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className={`shrink-0 rounded-lg border border-border object-cover ${
              compact ? "h-14 w-14" : "h-16 w-16 md:h-20 md:w-28"
            }`}
            src={item.cover_image_url}
          />
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ContentPostTypeBadge type={item.post_type} />
            {item.category ? (
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {item.category}
              </span>
            ) : null}
            {!item.indexable ? (
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-200">
                Nội bộ
              </span>
            ) : null}
          </div>
          <h2
            className={`font-semibold text-foreground group-hover:text-cyan-700 dark:group-hover:text-cyan-200 ${
              compact ? "line-clamp-2 text-sm leading-snug" : "text-lg leading-snug"
            }`}
          >
            {item.title}
          </h2>
          {!compact ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{excerpt}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {item.published_at ? (
              <time dateTime={item.published_at}>
                {new Date(item.published_at).toLocaleDateString("vi-VN")}
              </time>
            ) : null}
            <span>{readingMinutes} phút đọc</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
