"use client";

import { useState, type ReactNode } from "react";

export type StoryTabId = "chapters" | "about" | "comments" | "fan";

type StoryTab = {
  id: StoryTabId;
  label: string;
};

type StoryTabsProps = {
  tabs: StoryTab[];
  defaultTab?: StoryTabId;
  panels: Record<StoryTabId, ReactNode>;
};

export function StoryTabs({ defaultTab = "chapters", panels, tabs }: StoryTabsProps) {
  const [active, setActive] = useState<StoryTabId>(defaultTab);

  return (
    <section className="space-y-4">
      <div
        className="flex gap-1 overflow-x-auto border-b border-white/10 pb-0.5 no-scrollbar"
        role="tablist"
      >
        {tabs.map((tab) => (
          <button
            aria-selected={active === tab.id}
            className={`shrink-0 rounded-t-lg px-3.5 py-2.5 text-sm font-bold transition ${
              active === tab.id
                ? "border-b-2 border-cyan-300 text-cyan-100"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
            key={tab.id}
            onClick={() => setActive(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[active]}</div>
    </section>
  );
}
