import Link from "next/link";
import { getStoryImageForUsage } from "@/lib/images/get-story-image";
import {
  STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS,
  getStoryPlaceholderInitial
} from "@/lib/images/placeholders";
import type { StoryCommunityGroup } from "@/types/community";

const badgeLabel: Record<NonNullable<StoryCommunityGroup["badge"]>, string> = {
  hot: "HOT",
  new_chapter: "Mới chương",
  author_reply: "Tác giả trả lời"
};

type StoryGroupCardProps = {
  group: StoryCommunityGroup;
  layout?: "carousel" | "grid";
};

export function StoryGroupCard({ group, layout = "carousel" }: StoryGroupCardProps) {
  const cover = getStoryImageForUsage(
    { title: group.name, coverUrl: group.coverUrl },
    "communityCard"
  );

  return (
    <Link
      className={`tap-highlight flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-cyan-300/30 ${
        layout === "carousel" ? "w-[10.5rem] shrink-0" : "w-full"
      }`}
      href={`/community/story/${group.slug}`}
    >
      <div className="relative aspect-video h-20 bg-gradient-to-br from-cyan-500/20 via-indigo-600/20 to-fuchsia-600/20">
        {cover.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            src={cover.src}
            style={{ objectPosition: cover.objectPosition }}
          />
        ) : (
          <div
            className={`flex h-full items-center justify-center text-2xl font-black text-white/70 ${STORY_IMAGE_PLACEHOLDER_GRADIENT_CLASS}`}
          >
            {getStoryPlaceholderInitial(group.name)}
          </div>
        )}
        {group.badge ? (
          <span className="absolute left-2 top-2 rounded-full bg-cyan-300 px-2 py-0.5 text-[0.62rem] font-black uppercase text-zinc-950">
            {badgeLabel[group.badge]}
          </span>
        ) : null}
      </div>
      <div className="space-y-1 p-2.5">
        <p className="line-clamp-2 text-sm font-bold leading-5 text-white">{group.name}</p>
        <p className="line-clamp-2 text-[0.68rem] leading-4 text-zinc-400">
          {group.statusLine}
        </p>
      </div>
    </Link>
  );
}
