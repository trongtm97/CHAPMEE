import Link from "next/link";
import { GroupListItem } from "@/components/community/groups/GroupListItem";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type { CommunityGroupItem } from "@/types/community-group";

type MyGroupsSectionProps = {
  groups: CommunityGroupItem[];
  isLoggedIn: boolean;
};

export function MyGroupsSection({ groups, isLoggedIn }: MyGroupsSectionProps) {
  if (!isLoggedIn) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-black text-zinc-100">Nhóm của tôi</h2>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-400">
          Đăng nhập để theo dõi nhóm truyện bạn thích.
        </p>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-black text-zinc-100">Nhóm của tôi</h2>
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-zinc-400">
          Bạn chưa theo dõi nhóm truyện nào.{" "}
          <Link
            className="font-semibold text-cyan-300 hover:text-cyan-200"
            href={buildCommunityGroupsHref({ tab: "hot" })}
          >
            Khám phá nhóm hot
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black text-zinc-100">Nhóm của tôi</h2>
      <div className="space-y-2">
        {groups.map((group) => (
          <GroupListItem cta="join" group={group} key={group.id} />
        ))}
      </div>
    </section>
  );
}
