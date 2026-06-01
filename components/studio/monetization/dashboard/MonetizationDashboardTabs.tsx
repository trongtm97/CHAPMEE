"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import {
  STUDIO_MONETIZATION_TABS,
  type StudioMonetizationTab
} from "@/types/studio-monetization-dashboard";

const TAB_IDS = new Set(STUDIO_MONETIZATION_TABS.map((t) => t.id));

function parseTab(value: string | null): StudioMonetizationTab {
  if (value && TAB_IDS.has(value as StudioMonetizationTab)) {
    return value as StudioMonetizationTab;
  }
  return "overview";
}

type MonetizationDashboardTabsProps = {
  overview: ReactNode;
  paidStories: ReactNode;
  adRevenue: ReactNode;
  payout: ReactNode;
  transactions: ReactNode;
  policy: ReactNode;
};

export function MonetizationDashboardTabs({
  overview,
  paidStories,
  adRevenue,
  payout,
  transactions,
  policy
}: MonetizationDashboardTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = parseTab(searchParams.get("tab"));

  const setTab = (next: StudioMonetizationTab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const q = params.toString();
    router.replace(q ? `/studio/monetization?${q}` : "/studio/monetization", { scroll: false });
  };

  const panels: Record<StudioMonetizationTab, ReactNode> = {
    overview,
    "paid-stories": paidStories,
    "ad-revenue": adRevenue,
    payout,
    transactions,
    policy
  };

  return (
    <div className="space-y-6">
      <nav
        aria-label="Kiếm tiền"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-white/10 pb-0 scrollbar-thin"
      >
        {STUDIO_MONETIZATION_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              aria-selected={active}
              className={`shrink-0 rounded-t-lg px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400/60 ${
                active
                  ? "border-b-2 border-cyan-400 text-white"
                  : "text-zinc-500 hover:text-zinc-200"
              }`}
              onClick={() => setTab(item.id)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <div role="tabpanel">{panels[tab]}</div>
    </div>
  );
}
