"use client";

import Link from "next/link";
import { getProfileTabUrl } from "@/lib/profile/profile-url";
import type { PublicProfileTab } from "@/types/public-profile";

const tabLabels: Record<PublicProfileTab, string> = {
  stories: "Truyện",
  reels: "Reels",
  community: "Cộng đồng",
  achievements: "Thành tích",
  about: "Giới thiệu"
};

type ProfileTabsProps = {
  username: string;
  visibleTabs: PublicProfileTab[];
  activeTab: PublicProfileTab;
};

export function ProfileTabs({ activeTab, username, visibleTabs }: ProfileTabsProps) {
  if (visibleTabs.length <= 1) {
    return null;
  }

  return (
    <div
      className="sticky top-[calc(env(safe-area-inset-top)+3rem)] z-10 -mx-1 rounded-t-xl border border-white/8 border-b-white/10 bg-[#06090d]/95 px-1 backdrop-blur-md"
      role="tablist"
    >
      <div className="flex gap-0.5 overflow-x-auto pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {visibleTabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <Link
              aria-selected={active}
              className={`tap-highlight inline-flex h-9 shrink-0 items-center border-b-2 px-3 text-[0.82rem] font-semibold transition ${
                active
                  ? "border-cyan-300 text-cyan-100"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
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
