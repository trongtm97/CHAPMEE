import Link from "next/link";
import type { StudioAnalyticsRange } from "@/lib/studio/get-studio-analytics";
import { studioPath } from "@/lib/studio/constants";

type AnalyticsRangeTabsProps = {
  activeRange: StudioAnalyticsRange;
};

const RANGES: Array<{ label: string; value: StudioAnalyticsRange }> = [
  { label: "7 ngày", value: "7d" },
  { label: "30 ngày", value: "30d" },
  { label: "90 ngày", value: "90d" },
  { label: "Tất cả", value: "all" }
];

export function AnalyticsRangeTabs({ activeRange }: AnalyticsRangeTabsProps) {
  const basePath = studioPath("/analytics");

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-zinc-950 p-1 sm:grid-cols-4">
      {RANGES.map((range) => {
        const isActive = activeRange === range.value;

        return (
          <Link
            className={`rounded-lg px-3 py-2 text-center text-sm font-semibold transition ${
              isActive
                ? "bg-cyan-300 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
            href={`${basePath}?range=${range.value}`}
            key={range.value}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}
