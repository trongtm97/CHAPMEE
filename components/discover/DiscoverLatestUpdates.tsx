import Link from "next/link";
import type { ReactNode } from "react";
import type { DiscoverUpdateItem } from "@/lib/discover/latest-updates";
import { formatDiscoverUpdateTime } from "@/lib/discover/format-discover-update-time";

const PANEL_SCROLL_CLASS =
  "max-h-[min(20rem,42vh)] overflow-y-auto overscroll-contain md:max-h-[22.5rem] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.22)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/30";

const BADGE_CLASS: Record<DiscoverUpdateItem["type"], string> = {
  story: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  chapter: "border-violet-300/30 bg-violet-300/10 text-violet-100",
  post: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  audio: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  video: "border-fuchsia-300/30 bg-fuchsia-300/10 text-fuchsia-100"
};

type DiscoverLatestUpdatesProps = {
  items: DiscoverUpdateItem[];
  limit?: number;
};

function UpdateMetaLine({ item }: { item: DiscoverUpdateItem }) {
  const parts: ReactNode[] = [];

  if (item.parentTitle) {
    parts.push(
      <span key="parent" className="truncate">
        {item.parentTitle}
      </span>
    );
  }

  if (item.authorDisplayName || item.authorUsername) {
    if (parts.length > 0) {
      parts.push(
        <span key="sep" className="shrink-0 text-zinc-600">
          ·
        </span>
      );
    }
    parts.push(
      <span key="author" className="truncate">
        {item.authorUsername ? `@${item.authorUsername}` : item.authorDisplayName}
      </span>
    );
  }

  if (parts.length === 0) {
    return null;
  }

  return <span className="flex min-w-0 items-center gap-1">{parts}</span>;
}

function LatestUpdateRow({ item }: { item: DiscoverUpdateItem }) {
  const meta = <UpdateMetaLine item={item} />;
  const timeLabel = formatDiscoverUpdateTime(item.publishedAt);

  return (
    <li className="border-b border-white/[0.06] last:border-b-0">
      <Link
        className="group flex min-h-[3.5rem] flex-col gap-1.5 px-3 py-2.5 outline-none transition hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/35 sm:min-h-[4rem] sm:flex-row sm:items-center sm:gap-3 sm:px-3.5 md:px-4"
        href={item.href}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-2.5">
          <span
            className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[0.5625rem] font-bold uppercase leading-none tracking-[0.04em] sm:mt-0 ${BADGE_CLASS[item.type]}`}
          >
            {item.badgeLabel}
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug text-zinc-100 group-hover:text-white sm:text-sm">
              {item.title}
            </p>
            {meta ? (
              <p className="mt-0.5 line-clamp-1 text-[0.6875rem] text-zinc-500">{meta}</p>
            ) : null}
            <time
              className="mt-1 block text-[0.625rem] font-medium tabular-nums text-zinc-500 sm:hidden"
              dateTime={item.publishedAt}
            >
              {timeLabel}
            </time>
          </div>
        </div>
        <time
          className="hidden shrink-0 text-[0.625rem] font-medium tabular-nums text-zinc-500 sm:block sm:min-w-[4.5rem] sm:text-right"
          dateTime={item.publishedAt}
        >
          {timeLabel}
        </time>
      </Link>
    </li>
  );
}

export function DiscoverLatestUpdates({ items, limit = 20 }: DiscoverLatestUpdatesProps) {
  const visible = items.slice(0, limit);

  return (
    <section aria-labelledby="discover-latest-updates" className="space-y-2.5">
      <div className="space-y-0.5">
        <h2 className="text-base font-bold text-white md:text-lg" id="discover-latest-updates">
          Cập nhật mới
        </h2>
        <p className="text-xs leading-relaxed text-zinc-500">
          Truyện ra chương mới, truyện mới, bài viết mới, audio mới và video mới trên ChapMee.
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">Chưa có cập nhật mới.</p>
        </div>
      ) : (
        <div className={`rounded-xl border border-white/10 bg-[var(--surface)] ${PANEL_SCROLL_CLASS}`}>
          <ul className="flex flex-col">
            {visible.map((item) => (
              <LatestUpdateRow item={item} key={item.id} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
