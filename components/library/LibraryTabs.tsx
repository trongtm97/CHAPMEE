"use client";

import { LIBRARY_TABS } from "@/lib/library/library-tabs";
import type { LibraryTab } from "@/types/library";

type LibraryTabsProps = {
  activeTab: LibraryTab;
  onChange: (tab: LibraryTab) => void;
};

export function LibraryTabs({ activeTab, onChange }: LibraryTabsProps) {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5 scrollbar-none">
      {LIBRARY_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            className={`tap-highlight shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              isActive
                ? "bg-cyan-300 text-zinc-950"
                : "border border-white/8 bg-white/[0.03] text-zinc-400 hover:text-zinc-200"
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
  );
}
