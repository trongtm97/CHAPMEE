"use client";

import Link from "next/link";
import { RankingBoardIcon } from "@/components/rankings/RankingBoardIcons";
import {
  RANKING_SELECTOR_GROUPS,
  rankingTabHref
} from "@/lib/ranking/ranking-ui-utils";
import type { RankingUiTab, RankingUiTabId } from "@/types/ranking-board";
import { RANKING_UI_TABS } from "@/types/ranking-board";

type RankingSelectorProps = {
  activeTabId: RankingUiTabId;
};

function getTabById(id: RankingUiTabId): RankingUiTab {
  return RANKING_UI_TABS.find((tab) => tab.id === id)!;
}

export function RankingSelector({ activeTabId }: RankingSelectorProps) {
  return (
    <nav aria-label="Chọn bảng xếp hạng" className="space-y-4">
      {RANKING_SELECTOR_GROUPS.map((group) => (
        <div className="space-y-2" key={group.id}>
          <h2 className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-zinc-500">
            {group.label}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {group.tabIds.map((tabId) => {
              const tab = getTabById(tabId);
              return (
                <SelectorChip active={tabId === activeTabId} key={tabId} tab={tab} />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SelectorChip({ tab, active }: { tab: RankingUiTab; active: boolean }) {
  const href = rankingTabHref(tab);

  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`tap-highlight flex min-h-11 items-center gap-2 rounded-xl border px-2.5 py-2 transition sm:min-h-12 sm:px-3 ${
        active
          ? "border-yellow-400/45 bg-gradient-to-br from-yellow-500/20 to-amber-500/8 text-yellow-50 shadow-[0_0_0_1px_rgba(250,204,21,0.14)]"
          : "border-white/10 bg-[var(--surface)] text-zinc-300 hover:border-white/18 hover:bg-white/[0.03] hover:text-zinc-100"
      }`}
      href={href}
      title={tab.tagline}
    >
      <RankingBoardIcon
        className={`size-4 shrink-0 sm:size-[1.125rem] ${active ? "text-yellow-200" : "text-zinc-400"}`}
        tabId={tab.id}
      />
      <span className="min-w-0 flex-1 text-left text-[0.7rem] font-bold leading-snug sm:text-xs">
        {tab.label}
      </span>
    </Link>
  );
}
