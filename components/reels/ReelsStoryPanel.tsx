import Link from "next/link";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

type ReelsStoryPanelProps = {
  item: ReelsItem;
};

export function ReelsStoryPanel({ item }: ReelsStoryPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/90">Truyện</p>
      <h3 className="mt-2 text-lg font-bold text-white">{item.storyTitle}</h3>
      <p className="mt-2 text-sm text-zinc-300">
        {`Chương ${item.episodeNumber}`}
        {item.episodeTitle ? ` · ${item.episodeTitle}` : ""}
      </p>
      <p className="mt-3 line-clamp-4 text-sm leading-6 text-zinc-300">{item.excerpt}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          className="rounded-full bg-cyan-300 px-3 py-2 text-xs font-bold text-zinc-950"
          href={item.readMoreHref}
        >
          Đọc trọn chương
        </Link>
        <Link
          className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-100"
          href={item.storyHref}
        >
          Mở truyện
        </Link>
      </div>
    </section>
  );
}
