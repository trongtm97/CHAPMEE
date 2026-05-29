import Link from "next/link";
import type { CreatorStoryFilter } from "@/lib/creator/getCreatorStories";

type CreatorStoryFiltersProps = {
  activeFilter: CreatorStoryFilter;
  counts: Record<CreatorStoryFilter, number>;
  basePath?: string;
};

const filters: Array<{ label: string; value: CreatorStoryFilter }> = [
  { label: "Tất cả", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Published/Approved", value: "live" },
  { label: "Rejected/Archived", value: "closed" }
];

export function CreatorStoryFilters({
  activeFilter,
  basePath = "/studio",
  counts
}: CreatorStoryFiltersProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          const href =
            filter.value === "all"
              ? `${basePath}/stories`
              : `${basePath}/stories?status=${filter.value}`;

          return (
            <Link
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
              href={href}
              key={filter.value}
            >
              {filter.label} ({counts[filter.value]})
            </Link>
          );
        })}
      </div>
    </div>
  );
}
