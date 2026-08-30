"use client";

import {
  RANKING_PERIOD_OPTIONS,
  type PeriodOption
} from "@/lib/ranking/ranking-ui-utils";
import type { RankingTimeWindow } from "@/types/ranking-board";

type RankingPeriodTabsProps = {
  value: RankingTimeWindow;
  onChange: (window: RankingTimeWindow) => void;
  options?: PeriodOption[];
};

export function RankingPeriodTabs({
  value,
  onChange,
  options = RANKING_PERIOD_OPTIONS
}: RankingPeriodTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-zinc-500">Khoảng thời gian</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              className={`tap-highlight rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-cyan-300/35 bg-cyan-300/12 text-cyan-100"
                  : "border-white/8 bg-white/[0.03] text-zinc-400 hover:border-white/15 hover:text-zinc-200"
              }`}
              key={option.value}
              onClick={() => onChange(option.value)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
