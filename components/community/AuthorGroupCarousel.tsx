import { AuthorGroupCard } from "@/components/community/AuthorGroupCard";
import type { AuthorCommunityGroup } from "@/types/community";

type AuthorGroupCarouselProps = {
  groups: AuthorCommunityGroup[];
};

export function AuthorGroupCarousel({ groups }: AuthorGroupCarouselProps) {
  const replying = groups.filter((group) => group.isReplying);

  if (!replying.length) {
    return null;
  }

  return (
    <section className="space-y-2.5">
      <h2 className="text-sm font-bold text-zinc-100">Tác giả đang trả lời</h2>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2.5 pb-0.5">
          {replying.map((group) => (
            <AuthorGroupCard group={group} key={group.id} />
          ))}
        </div>
      </div>
    </section>
  );
}
