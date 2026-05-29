import Link from "next/link";
import { buildStudioManagerHref } from "@/lib/studio/manager-url";

type Tab<T extends string> = {
  label: string;
  value: T;
};

type StudioManagerTabsProps<T extends string> = {
  basePath: string;
  active: T;
  counts: Record<T, number>;
  tabs: Tab<T>[];
  query: Record<string, string | undefined>;
  /** Query key for filter tab (default `status`). */
  filterParam?: string;
};

export function StudioManagerTabs<T extends string>({
  active,
  basePath,
  counts,
  filterParam = "status",
  query,
  tabs
}: StudioManagerTabsProps<T>) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {tabs.map((tab) => {
          const isActive = active === tab.value;

          return (
            <Link
              className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-sky-300 bg-sky-300 text-zinc-950"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
              }`}
              href={buildStudioManagerHref(basePath, {
                ...query,
                page: undefined,
                [filterParam]: tab.value === "all" ? undefined : tab.value
              })}
              key={tab.value}
            >
              {tab.label} ({counts[tab.value]})
            </Link>
          );
        })}
      </div>
    </div>
  );
}
