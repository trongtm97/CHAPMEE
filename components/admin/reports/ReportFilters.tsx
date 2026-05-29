import Link from "next/link";
import type { ReportStatus } from "@/lib/admin/getReports";

type ReportFiltersProps = {
  activeStatus: ReportStatus;
};

const filters: Array<{ label: string; value: ReportStatus }> = [
  { label: "Mới", value: "pending" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Resolved", value: "resolved" },
  { label: "Rejected", value: "rejected" }
];

export function ReportFilters({ activeStatus }: ReportFiltersProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-2">
        {filters.map((filter) => {
          const isActive = activeStatus === filter.value;

          return (
            <Link
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border-cyan-300 bg-cyan-300 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
              }`}
              href={`/admin/reports?status=${filter.value}`}
              key={filter.value}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
