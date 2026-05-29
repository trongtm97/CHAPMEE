"use client";

import type { ChapterRange } from "@/types/chapter";

type ChapterRangeSelectorProps = {
  ranges: ChapterRange[];
  current: ChapterRange | null;
  onChange: (range: ChapterRange) => void;
};

export function ChapterRangeSelector({ current, onChange, ranges }: ChapterRangeSelectorProps) {
  if (ranges.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-zinc-400">Chọn khoảng chương</p>
      <div className="flex flex-wrap gap-1.5">
        {ranges.map((range) => {
          const active =
            current?.start === range.start && current?.end === range.end;
          return (
            <button
              className={`tap-highlight rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-cyan-300 text-zinc-950"
                  : "bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
              }`}
              key={`${range.start}-${range.end}`}
              onClick={() => onChange(range)}
              type="button"
            >
              {range.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
