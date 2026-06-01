"use client";

import { useState } from "react";
import { MonetizationChaptersTab } from "@/components/studio/monetization/MonetizationChaptersTab";
import { MonetizationFullAccessTab } from "@/components/studio/monetization/MonetizationFullAccessTab";
import { MonetizationStoriesTab } from "@/components/studio/monetization/MonetizationStoriesTab";
import { TipSettingsSection } from "@/components/studio/monetization/TipSettingsSection";
import type { CreatorMonetizationProfile } from "@/types/creator-monetization";
import type { StudioMonetizationConfigView } from "@/types/studio-monetization";
import type { StudioMonetizationGenreOption } from "@/types/studio-monetization-stories";

type WorkspaceTab = "stories" | "chapters" | "bundle" | "tip";

const TABS: Array<{
  id: WorkspaceTab;
  label: string;
  hint: string;
  accent: string;
}> = [
  {
    id: "stories",
    label: "Truyện trả phí",
    hint: "Cài đặt quy tắc giá theo từng truyện.",
    accent: "from-cyan-500/10"
  },
  {
    id: "chapters",
    label: "Chương trả phí",
    hint: "Cài đặt giá riêng cho từng chương.",
    accent: "from-sky-500/10"
  },
  {
    id: "bundle",
    label: "Trọn bộ",
    hint: "Bán toàn bộ truyện, bao gồm chương tương lai.",
    accent: "from-violet-500/10"
  },
  {
    id: "tip",
    label: "Tip",
    hint: "Cài đặt lời cảm ơn và nhận ủng hộ từ độc giả.",
    accent: "from-rose-500/10"
  }
];

type MonetizationWorkspaceTabsProps = {
  canConfigure: boolean;
  config: StudioMonetizationConfigView;
  genreOptions: StudioMonetizationGenreOption[];
  storiesTotalCount: number;
  profile: CreatorMonetizationProfile | null;
  defaultTab?: WorkspaceTab;
};

export function MonetizationWorkspaceTabs({
  canConfigure,
  config,
  genreOptions,
  storiesTotalCount,
  profile,
  defaultTab = "stories"
}: MonetizationWorkspaceTabsProps) {
  const [tab, setTab] = useState<WorkspaceTab>(defaultTab);
  const activeTab = TABS.find((item) => item.id === tab) ?? TABS[0];

  if (!config.paidChaptersEnabled) {
    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-400">
        Admin chưa bật chương trả phí trên nền tảng.
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40"
      id="monetization-workspace"
    >
      <div className="border-b border-white/10 px-3 pt-4 sm:px-4">
        <h2 className="px-1 text-sm font-semibold text-white">Quản lý trả phí</h2>
        <nav
          aria-label="Tab quản lý trả phí"
          className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-0 scrollbar-thin"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                className={`shrink-0 rounded-t-xl border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60 sm:min-w-[8.5rem] ${
                  active
                    ? `border-cyan-400/30 border-b-transparent bg-gradient-to-b ${item.accent} to-zinc-900 text-cyan-50`
                    : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                }`}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                <span className="block text-xs font-bold sm:text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <p className="mt-3 px-1 pb-3 text-xs leading-relaxed text-zinc-500">{activeTab.hint}</p>
      </div>

      <div className="p-3 sm:p-4">
        {tab === "stories" ? (
          <MonetizationStoriesTab
            canConfigure={canConfigure}
            config={config}
            genreOptions={genreOptions}
            storiesTotalCount={storiesTotalCount}
          />
        ) : null}
        {tab === "chapters" ? (
          <MonetizationChaptersTab canConfigure={canConfigure} config={config} />
        ) : null}
        {tab === "bundle" ? (
          <MonetizationFullAccessTab
            canConfigure={canConfigure}
            config={config}
            storiesTotalCount={storiesTotalCount}
          />
        ) : null}
        {tab === "tip" ? (
          <TipSettingsSection
            canConfigure={canConfigure}
            embedded
            profile={profile}
            tipsEnabled={config.tipsEnabled}
          />
        ) : null}
      </div>
    </section>
  );
}

export type { WorkspaceTab };
