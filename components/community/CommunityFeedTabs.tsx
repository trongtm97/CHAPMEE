"use client";

import type { CommunityFeedTab } from "@/types/community";

const tabs: { id: CommunityFeedTab; label: string }[] = [
  { id: "for_you", label: "Dành cho bạn" },
  { id: "hot", label: "Đang hot" },
  { id: "new", label: "Mới nhất" },
  { id: "following", label: "Theo dõi" }
];

type CommunityFeedTabsProps = {
  activeTab: CommunityFeedTab;
  onChange: (tab: CommunityFeedTab) => void;
};

export function CommunityFeedTabs({ activeTab, onChange }: CommunityFeedTabsProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex min-w-max gap-2 pb-0.5">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;

          return (
            <button
              className={`tap-highlight shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 bg-white/[0.04] text-zinc-400 hover:text-zinc-200"
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
