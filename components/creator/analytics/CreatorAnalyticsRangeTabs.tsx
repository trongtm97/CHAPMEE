import Link from "next/link";
import type { CreatorAnalyticsRange } from "@/lib/creator/getCreatorAnalytics";

type CreatorAnalyticsRangeTabsProps = {
  activeRange: CreatorAnalyticsRange;
  basePath?: string;
};

export function CreatorAnalyticsRangeTabs({
  activeRange,
  basePath = "/studio"
}: CreatorAnalyticsRangeTabsProps) {
  const ranges: { href: string; label: string; value: CreatorAnalyticsRange }[] =
    [
      { href: `${basePath}/analytics?range=7d`, label: "7 ngay", value: "7d" },
      {
        href: `${basePath}/analytics?range=30d`,
        label: "30 ngay",
        value: "30d"
      },
      { href: `${basePath}/analytics?range=all`, label: "Tat ca", value: "all" }
    ];

  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-1">
      {ranges.map((range) => {
        const isActive = activeRange === range.value;

        return (
          <Link
            className={`rounded-md px-3 py-2 text-center text-sm font-semibold transition ${
              isActive
                ? "bg-cyan-300 text-zinc-950"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
            href={range.href}
            key={range.value}
          >
            {range.label}
          </Link>
        );
      })}
    </div>
  );
}
