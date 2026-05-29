"use client";

import type { CreatorBonusAllocation } from "@/types/creator-bonus";

type BonusAllocationTableProps = {
  allocations: CreatorBonusAllocation[];
};

export function BonusAllocationTable({ allocations }: BonusAllocationTableProps) {
  if (allocations.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có allocation.</p>;
  }

  return (
    <div className="space-y-2">
      {allocations.map((allocation) => (
        <div
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm"
          key={allocation.id}
        >
          <span className="text-zinc-300">{allocation.creator_user_id.slice(0, 8)}</span>
          <span className="text-zinc-300">score {allocation.score.toFixed(2)}</span>
          <span className="text-zinc-100">
            {allocation.amount_vnd.toLocaleString("vi-VN")} VND
          </span>
          <span className="text-zinc-300">{allocation.status}</span>
        </div>
      ))}
    </div>
  );
}
