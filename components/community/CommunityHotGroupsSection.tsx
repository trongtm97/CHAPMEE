import Link from "next/link";
import { StoryGroupCard } from "@/components/community/StoryGroupCard";
import { getCommunityAuthorHref } from "@/lib/community/community-author-url";
import { AvatarFallback } from "@/components/ui";
import type { AuthorCommunityGroup, StoryCommunityGroup } from "@/types/community";

type HotCard =
  | { kind: "story"; group: StoryCommunityGroup }
  | { kind: "author"; group: AuthorCommunityGroup };

type CommunityHotGroupsSectionProps = {
  storyGroups: StoryCommunityGroup[];
  authorGroups: AuthorCommunityGroup[];
};

export function CommunityHotGroupsSection({
  authorGroups,
  storyGroups
}: CommunityHotGroupsSectionProps) {
  const cards: HotCard[] = [
    ...storyGroups.slice(0, 4).map((group) => ({ kind: "story" as const, group })),
    ...authorGroups
      .filter((group) => group.isReplying)
      .slice(0, 3)
      .map((group) => ({ kind: "author" as const, group }))
  ];

  if (!cards.length) {
    return null;
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          Đang sôi nổi
        </h2>
        <Link className="text-xs font-bold text-cyan-300" href="/community/groups">
          Xem thêm
        </Link>
      </div>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2 pb-0.5">
          {cards.map((card) =>
            card.kind === "story" ? (
              <StoryGroupCard group={card.group} key={card.group.id} layout="compact" />
            ) : (
              <Link
                className="flex w-[8.5rem] shrink-0 flex-col items-center rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center"
                href={getCommunityAuthorHref(card.group)}
                key={card.group.id}
              >
                <AvatarFallback name={card.group.name} size="sm" src={card.group.avatarUrl} />
                <p className="mt-1.5 line-clamp-2 text-xs font-bold leading-4 text-zinc-100">
                  {card.group.name}
                </p>
                <p className="line-clamp-1 text-[0.65rem] text-cyan-200/90">
                  {card.group.statusLine}
                </p>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
