"use client";

import Link from "next/link";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { PublicProfileTab } from "@/types/public-profile";

const tabLabels: Record<PublicProfileTab, string> = {
  collections: "Tủ truyện",
  activity: "Hoạt động",
  comments: "Bình luận",
  badges: "Thành tích",
  works: "Tác phẩm"
};

type PublicProfileTabsProps = {
  username: string;
  visibleTabs: PublicProfileTab[];
  activeTab: PublicProfileTab;
};

export function PublicProfileTabs({
  activeTab,
  username,
  visibleTabs
}: PublicProfileTabsProps) {
  if (!visibleTabs.length) {
    return null;
  }

  return (
    <div
      className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      <div className="flex w-max min-w-full gap-1 pr-2">
        {visibleTabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <Link
              aria-selected={active}
              className={`tap-highlight inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[0.6875rem] font-semibold transition ${
                active
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-transparent bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
              }`}
              href={getProfileTabUrl(username, tab) ?? "#"}
              key={tab}
              role="tab"
            >
              {tabLabels[tab]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
