import { Card, SectionHeader } from "@/components/ui";
import type { CreatorBonusAllocation, CreatorBonusPool } from "@/types/creator-bonus";

type CreatorBonusCardProps = {
  allocations: CreatorBonusAllocation[];
  poolsById: Record<string, CreatorBonusPool>;
};

export function CreatorBonusCard({ allocations, poolsById }: CreatorBonusCardProps) {
  if (allocations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <SectionHeader
        title="Bonus từ ChapMee"
        subtitle="Phần thưởng creator theo chất lượng và tăng trưởng."
      />
      <Card className="space-y-2">
        {allocations.slice(0, 5).map((allocation) => {
          const pool = poolsById[allocation.pool_id];
          return (
            <div
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm"
              key={allocation.id}
            >
              <span className="text-zinc-300">
                {pool?.name ?? "Bonus pool"} ({pool ? new Date(pool.period_start).toLocaleDateString() : "-"} -{" "}
                {pool ? new Date(pool.period_end).toLocaleDateString() : "-"})
              </span>
              <span className="font-semibold text-emerald-200">
                {allocation.amount_vnd.toLocaleString("vi-VN")} VND
              </span>
            </div>
          );
        })}
      </Card>
    </section>
  );
}
