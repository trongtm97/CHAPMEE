import Link from "next/link";
import { isContentPostFeatured } from "@/lib/content-posts/featured";
import {
  estimateReadingMinutes,
  getPublicPostTypeLabel
} from "@/lib/content-posts/public-catalog";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { getContentPostUrl } from "@/lib/urls/paths";
import type { AdminContentPost } from "@/types/platform-content";

type ContentPostCardLayout = "list" | "grid" | "featured";

type ContentPostCardProps = {
  item: AdminContentPost;
  compact?: boolean;
  featured?: boolean;
  layout?: ContentPostCardLayout;
};

function formatViewCount(count: number): string | null {
  if (count <= 0) return null;
  if (count < 1000) return `${count} lượt xem`;
  return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k lượt xem`;
}

function CoverBlock({
  coverUrl,
  layout
}: {
  coverUrl: string | null;
  layout: ContentPostCardLayout;
}) {
  const sizeClass =
    layout === "featured"
      ? "aspect-[16/9] w-full md:aspect-[2/1]"
      : layout === "grid"
        ? "aspect-[16/10] w-full"
        : "h-16 w-20 shrink-0 md:h-24 md:w-32";

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt=""
        className={`rounded-xl border border-white/10 object-cover ${sizeClass}`}
        loading="lazy"
        src={coverUrl}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`rounded-xl border border-white/10 bg-gradient-to-br from-cyan-950/50 via-zinc-900 to-pink-950/40 ${sizeClass}`}
    />
  );
}

export function ContentPostCard({
  item,
  compact = false,
  featured = false,
  layout = "list"
}: ContentPostCardProps) {
  const href =
    item.public_code != null
      ? getContentPostUrl({ slug: item.slug, public_code: item.public_code })
      : `/bai-viet/${item.slug}`;
  const excerpt =
    item.excerpt?.trim() || createExcerpt(item.content ?? "", 20, compact ? 24 : 36);
  const readingMinutes = estimateReadingMinutes(item.content ?? item.excerpt ?? "");
  const coverUrl = item.coverDisplayUrl ?? null;
  const viewsLabel = formatViewCount(item.view_count);
  const typeLabel = getPublicPostTypeLabel(item.post_type);
  const isFeaturedLayout = layout === "featured";
  const isGrid = layout === "grid";
  const showFeaturedBadge = featured || isContentPostFeatured(item);

  const cardInner = (
    <>
      {isFeaturedLayout || isGrid ? (
        <CoverBlock coverUrl={coverUrl} layout={layout} />
      ) : coverUrl ? (
        <CoverBlock coverUrl={coverUrl} layout={layout} />
      ) : !compact ? (
        <CoverBlock coverUrl={null} layout={layout} />
      ) : null}

      <div className={`min-w-0 flex-1 ${isFeaturedLayout || isGrid ? "space-y-2 p-4 md:p-5" : "space-y-1.5"}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {typeLabel}
          </span>
          {showFeaturedBadge ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
              Nên đọc trước
            </span>
          ) : null}
          {!item.indexable ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              Nội bộ
            </span>
          ) : null}
        </div>
        <h3
          className={`font-bold text-zinc-50 group-hover:text-cyan-100 ${
            isFeaturedLayout
              ? "line-clamp-3 text-xl leading-snug md:text-2xl"
              : compact
                ? "line-clamp-2 text-sm leading-snug"
                : "line-clamp-2 text-base leading-snug md:text-lg"
          }`}
        >
          {item.title}
        </h3>
        {!compact || isFeaturedLayout ? (
          <p
            className={`line-clamp-2 text-zinc-400 ${
              isFeaturedLayout ? "text-sm leading-relaxed md:text-[0.9375rem]" : "text-sm"
            }`}
          >
            {excerpt}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
          {item.published_at ? (
            <time dateTime={item.published_at}>
              {new Date(item.published_at).toLocaleDateString("vi-VN")}
            </time>
          ) : null}
          <span>{readingMinutes} phút đọc</span>
          {viewsLabel ? <span>{viewsLabel}</span> : null}
        </div>
        {!compact ? (
          <span className="inline-flex text-xs font-semibold text-cyan-300/90 group-hover:text-cyan-200">
            Đọc bài →
          </span>
        ) : null}
      </div>
    </>
  );

  return (
    <Link
      className={`group block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition hover:border-cyan-300/30 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
        isFeaturedLayout
          ? "h-full"
          : isGrid
            ? ""
            : compact
              ? "p-3"
              : "p-4 md:p-5"
      }`}
      href={href}
    >
      <article
        className={
          isFeaturedLayout
            ? "flex h-full flex-col"
            : isGrid
              ? "flex flex-col"
              : `flex gap-3 ${coverUrl && !compact ? "md:gap-4" : ""}`
        }
      >
        {cardInner}
      </article>
    </Link>
  );
}
