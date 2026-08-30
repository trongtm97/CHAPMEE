import Link from "next/link";
import { ChapMeeStoryCover } from "@/components/common/ChapMeeCover";
import { getStoryGroupHref } from "@/lib/community/story-group-routes";
import type { StoryCommunityGroup } from "@/types/community";
const badgeLabel: Record<NonNullable<StoryCommunityGroup["badge"]>, string> = {
  hot: "HOT",
  new_chapter: "Mới chương",
  author_reply: "Tác giả trả lời"
};

type StoryGroupCardProps = {
  group: StoryCommunityGroup;
  layout?: "carousel" | "compact" | "grid";
};

export function StoryGroupCard({ group, layout = "carousel" }: StoryGroupCardProps) {
  const widthClass =
    layout === "carousel"
      ? "w-[10.5rem] shrink-0"
      : layout === "compact"
        ? "w-[8.5rem] shrink-0"
        : "w-full";

  return (
    <Link
      className={`tap-highlight flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-cyan-300/30 ${widthClass}`}
      href={getStoryGroupHref({ slug: group.slug })}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
        <ChapMeeStoryCover
          className="size-full rounded-none border-0 shadow-none"
          rounded={false}
          showFallbackTitle={false}
          size="full"
          story={{ title: group.name, coverUrl: group.coverUrl }}
          usage="communityCard"
          badge={
            group.badge ? (
              <span className="absolute left-2 top-2 rounded-full bg-cyan-300 px-2 py-0.5 text-[0.62rem] font-black uppercase text-zinc-950">
                {badgeLabel[group.badge]}
              </span>
            ) : null
          }
        />
      </div>
      <div className={`space-y-1 ${layout === "compact" ? "p-2" : "p-2.5"}`}>
        <p
          className={`line-clamp-2 font-bold leading-5 text-white ${
            layout === "compact" ? "text-xs leading-4" : "text-sm"
          }`}
        >
          {group.name}
        </p>
        <p
          className={`line-clamp-2 text-zinc-400 ${
            layout === "compact" ? "text-[0.65rem] leading-4" : "text-[0.68rem] leading-4"
          }`}
        >
          {group.statusLine}
        </p>
      </div>
    </Link>
  );
}
