import Link from "next/link";
import { StoryImageView } from "@/components/common/StoryImageView";
import { contentCard, contentCardPad, contentCtaGhost } from "@/components/ui/content-card-styles";
import { REELS_PUBLIC_PATH } from "@/lib/routes/reels-paths";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

type ReelsHighlightCardProps = {
  item: ReelsItem;
};

export function ReelsHighlightCard({ item }: ReelsHighlightCardProps) {
  const story = {
    title: item.storyTitle,
    coverUrl: item.backgroundImageUrl
  };
  const hook = item.hookTitle || item.excerpt;
  const chapterLine =
    item.episodeNumber > 0
      ? `Chap ${item.episodeNumber}${item.episodeTitle ? ` · ${item.episodeTitle}` : ""}`
      : null;

  return (
    <Link
      className={`tap-highlight flex w-[9.75rem] shrink-0 snap-start flex-col sm:w-[10.25rem] ${contentCard} ${contentCardPad}`}
      href={REELS_PUBLIC_PATH}
    >
      <StoryImageView
        story={story}
        usage="discoverCard"
        wrapperClassName="mb-2 overflow-hidden rounded-lg border border-white/10"
      />
      <p className="line-clamp-1 text-xs font-bold text-white">{item.storyTitle}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.68rem] leading-4 text-zinc-500">
        {chapterLine ?? hook}
      </p>
      <span className={`${contentCtaGhost} mt-2 w-full justify-center text-center`}>
        Xem Reels
      </span>
    </Link>
  );
}
