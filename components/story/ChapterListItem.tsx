import Link from "next/link";
import { getStoryChapterHref } from "@/lib/stories/story-routes";
import type { StoryChapterMeta } from "@/types/chapter";

type ChapterListItemProps = {
  chapter: StoryChapterMeta;
  storySlug: string;
  storyPublicCode: string;
  status?: "reading" | "read" | "new" | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value));
}

function isRecentlyPublished(value: string | null) {
  if (!value) {
    return false;
  }
  const published = new Date(value).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return published >= weekAgo;
}

export function ChapterListItem({
  chapter,
  status,
  storySlug,
  storyPublicCode
}: ChapterListItemProps) {
  const isNew = status !== "reading" && status !== "read" && isRecentlyPublished(chapter.publishedAt);
  const href = getStoryChapterHref(
    { slug: storySlug, public_code: storyPublicCode },
    { slug: chapter.slug, public_code: chapter.publicCode }
  );

  if (!chapter.episodeNumber || !storySlug || !storyPublicCode) {
    return null;
  }

  return (
    <Link
      className={`tap-highlight relative z-[1] block rounded-xl border px-3.5 py-2.5 transition ${
        status === "reading"
          ? "border-cyan-300/35 bg-cyan-300/[0.06]"
          : "border-white/8 bg-white/[0.02] hover:border-cyan-300/25 hover:bg-white/[0.04]"
      }`}
      href={href}
      prefetch={false}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-cyan-200/90">Chap {chapter.episodeNumber}</span>
            {status === "reading" ? (
              <span className="rounded-full bg-cyan-300/15 px-2 py-0.5 text-[0.65rem] font-bold text-cyan-100">
                Đang đọc
              </span>
            ) : null}
            {status === "read" ? (
              <span className="text-[0.65rem] font-semibold text-zinc-500">Đã đọc</span>
            ) : null}
            {isNew ? (
              <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[0.65rem] font-bold text-amber-100">
                Mới
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-white">{chapter.title}</p>
          {chapter.excerpt ? (
            <p className="mt-0.5 line-clamp-1 text-xs leading-5 text-zinc-500">{chapter.excerpt}</p>
          ) : null}
        </div>
        {formatDate(chapter.publishedAt) ? (
          <span className="shrink-0 text-[0.68rem] text-zinc-500">
            {formatDate(chapter.publishedAt)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
