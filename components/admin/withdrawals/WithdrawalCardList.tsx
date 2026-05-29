"use client";

import { formatVnd } from "@/lib/admin/withdrawals/withdrawal-labels";
import type { AdminWithdrawalListRow } from "@/types/admin-withdrawal";
import { WithdrawalRiskBadge, WithdrawalStatusBadge } from "@/components/admin/withdrawals/WithdrawalBadges";
import { Button } from "@/components/ui";

type Props = {
  rows: AdminWithdrawalListRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function WithdrawalCardList({ rows, selectedId, onSelect }: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <article
          className={`rounded-xl border p-4 ${
            selectedId === row.id ? "border-cyan-400/40 bg-cyan-500/5" : "border-white/10"
          }`}
          key={row.id}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-cyan-200">{row.withdrawalCode}</p>
              <p className="mt-1 font-semibold text-white">{row.displayName}</p>
              <p className="text-xs text-zinc-500">{row.studioName ?? "—"}</p>
            </div>
            <WithdrawalRiskBadge level={row.riskLevel} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-zinc-500">Số tiền</dt>
              <dd className="text-white">{formatVnd(row.amountVnd)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Thực nhận</dt>
              <dd className="text-emerald-200">{formatVnd(row.netAmountVnd)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Trạng thái</dt>
              <dd className="mt-0.5">
                <WithdrawalStatusBadge status={row.status} />
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Phương thức</dt>
              <dd className="text-zinc-300">{row.methodLabel}</dd>
            </div>
          </dl>
          <Button className="mt-3 w-full" onClick={() => onSelect(row.id)} type="button" variant="secondary">
            Xem chi tiết
          </Button>
        </article>
      ))}
    </div>
  );
}
