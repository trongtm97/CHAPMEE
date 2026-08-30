import { AuthorGroupCard } from "@/components/community/AuthorGroupCard";
import type { AuthorCommunityGroup } from "@/types/community";

type AuthorGroupCarouselProps = {
  groups: AuthorCommunityGroup[];
};

export function AuthorGroupCarousel({ groups }: AuthorGroupCarouselProps) {
  const replying = groups.filter((group) => group.isReplying);
  const visibleGroups = replying.length ? replying : groups;

  if (!visibleGroups.length) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-bold text-zinc-100">
        {replying.length ? "Tác giả đang trả lời" : "Tác giả"}
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5 pb-0.5">
          {visibleGroups.map((group) => (
            <AuthorGroupCard group={group} key={group.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
