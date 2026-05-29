"use client";

import { useEffect, useRef } from "react";
import type { MePageTab } from "@/types/me-page";

const tabs: { id: MePageTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "reading", label: "Đọc" },
  { id: "writing", label: "Viết" },
  { id: "activity", label: "Hoạt động" },
  { id: "achievements", label: "Thành tích" }
];

type ProfileTabsProps = {
  activeTab: MePageTab;
  onChange: (tab: MePageTab) => void;
};

export function ProfileTabs({ activeTab, onChange }: ProfileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }
    const activeButton = container.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeTab}"]`
    );
    activeButton?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTab]);

  return (
    <div
      className="-mx-4 overflow-x-auto scroll-smooth px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      ref={scrollRef}
      role="tablist"
    >
      <div className="flex w-max min-w-full gap-1 pr-2">
        {tabs.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              aria-selected={active}
              className={`tap-highlight inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-[0.6875rem] font-semibold transition ${
                active
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-transparent bg-white/[0.02] text-zinc-500 hover:text-zinc-300"
              }`}
              data-tab-id={tab.id}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              role="tab"
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

export { tabs as mePageTabs };
