import Link from "next/link";
import type { DiscoverCreatorSpotlight } from "@/lib/discover/getDiscoverData";

type CreatorSpotlightSectionProps = {
  creators: DiscoverCreatorSpotlight[];
};

export function CreatorSpotlightSection({ creators }: CreatorSpotlightSectionProps) {
  if (creators.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-black text-white">Tác giả đang lên</h2>
        <Link className="text-xs font-bold text-cyan-200" href="/tac-gia">
          Xem thêm
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-2.5 pb-0.5 pr-4 md:gap-3 md:pr-0">
          {creators.slice(0, 6).map((creator) => (
            <Link
              className="tap-highlight flex w-[8.5rem] shrink-0 flex-col items-center rounded-2xl border border-white/10 bg-[var(--surface)] p-3 text-center transition hover:border-cyan-300/30"
              href={`/creators/${creator.id}`}
              key={creator.id}
            >
              <span className="flex size-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/15 text-sm font-black text-cyan-100">
                {creator.penName.charAt(0).toUpperCase()}
              </span>
              <p className="mt-2 line-clamp-2 w-full text-xs font-bold leading-snug text-zinc-100">{creator.penName}</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {creator.storyCount} truyện
              </p>
              <span className="mt-2 text-[10px] font-bold text-cyan-200">Xem</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
