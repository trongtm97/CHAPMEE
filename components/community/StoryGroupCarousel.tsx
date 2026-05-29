import Link from "next/link";
import { StoryGroupCard } from "@/components/community/StoryGroupCard";
import type { StoryCommunityGroup } from "@/types/community";

type StoryGroupCarouselProps = {
  groups: StoryCommunityGroup[];
};

export function StoryGroupCarousel({ groups }: StoryGroupCarouselProps) {
  if (!groups.length) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-100">Nhóm truyện đang sôi nổi</h2>
        <Link
          className="shrink-0 text-xs font-bold text-cyan-300 hover:text-cyan-200"
          href="/community/groups"
        >
          Xem tất cả
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5 pb-0.5">
          {groups.map((group) => (
            <StoryGroupCard group={group} key={group.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
