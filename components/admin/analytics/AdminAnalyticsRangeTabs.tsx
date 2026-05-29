import Link from "next/link";
import type { AdminAnalyticsRange } from "@/lib/admin/getAdminAnalytics";

type AdminAnalyticsRangeTabsProps = {
  activeRange: AdminAnalyticsRange;
};

const ranges: { href: string; label: string; value: AdminAnalyticsRange }[] = [
  { href: "/admin/analytics?range=7d", label: "7 ngay", value: "7d" },
  { href: "/admin/analytics?range=30d", label: "30 ngay", value: "30d" },
  { href: "/admin/analytics?range=all", label: "Tat ca", value: "all" }
];

export function AdminAnalyticsRangeTabs({
  activeRange
}: AdminAnalyticsRangeTabsProps) {
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
