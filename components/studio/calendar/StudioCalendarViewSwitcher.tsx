"use client";

import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";
import type { CalendarViewMode } from "@/types/scheduling";

const VIEWS: Array<{ label: string; value: CalendarViewMode }> = [
  { label: "Danh sách", value: "list" },
  { label: "Tuần", value: "week" },
  { label: "Tháng", value: "month" }
];

type StudioCalendarViewSwitcherProps = {
  activeView: CalendarViewMode;
  basePath: string;
  query: Record<string, string | undefined>;
};

export function StudioCalendarViewSwitcher({
  activeView,
  basePath,
  query
}: StudioCalendarViewSwitcherProps) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {VIEWS.map((view) => {
          const isActive = activeView === view.value;

          return (
            <Link
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-sky-300 bg-sky-300 text-zinc-950"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                page: undefined,
                view: view.value === "list" ? undefined : view.value
              })}
              key={view.value}
            >
              {view.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
