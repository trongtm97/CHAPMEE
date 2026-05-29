import Link from "next/link";
import { buildCommunityGroupsHref } from "@/lib/community/community-groups-query";
import type { CommunityGroupSort, CommunityGroupTab } from "@/types/community-group";

const tabs: { id: CommunityGroupTab; label: string }[] = [
  { id: "following", label: "Đang theo dõi" },
  { id: "hot", label: "Đang hot" },
  { id: "new_chapter", label: "Có chương mới" },
  { id: "author_reply", label: "Tác giả trả lời" }
];

type GroupFilterTabsProps = {
  activeTab: CommunityGroupTab | null;
  query: string;
  genre: string;
  sort: CommunityGroupSort;
};

function TabChip({
  active,
  children,
  href
}: {
  active: boolean;
  children: string;
  href: string;
}) {
  return (
    <Link
      className={`whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition ${
        active
          ? "border-cyan-300/50 bg-cyan-300/20 text-cyan-100"
          : "border-white/10 text-zinc-300 hover:border-white/20"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function GroupFilterTabs({ activeTab, genre, query, sort }: GroupFilterTabsProps) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <TabChip
          active={activeTab === tab.id}
          href={buildCommunityGroupsHref({
            q: query || undefined,
            genre: genre || undefined,
            sort,
            tab: tab.id,
            page: 1
          })}
          key={tab.id}
        >
          {tab.label}
        </TabChip>
      ))}
    </div>
  );
}
