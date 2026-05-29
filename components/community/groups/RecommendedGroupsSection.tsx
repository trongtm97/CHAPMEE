import { GroupFeaturedCard } from "@/components/community/groups/GroupFeaturedCard";
import type { CommunityGroupItem } from "@/types/community-group";

type RecommendedGroupsSectionProps = {
  groups: CommunityGroupItem[];
};

export function RecommendedGroupsSection({ groups }: RecommendedGroupsSectionProps) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black text-zinc-100">Nhóm dành cho bạn</h2>
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <GroupFeaturedCard group={group} key={group.id} />
        ))}
      </div>
    </section>
  );
}
