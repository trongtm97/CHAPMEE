"use client";

import Link from "next/link";
import {
  formatCoin,
  formatRefundId,
  formatVnd,
  refundTypeLabel
} from "@/lib/admin/refunds/refund-labels";
import type { AdminRefundListRow, RefundAdminCapabilities } from "@/types/admin-refund";
import { RefundRiskBadge, RefundStatusBadge } from "@/components/admin/refunds/RefundBadges";
import { Button } from "@/components/ui";
import type { RefundRowAction } from "@/components/admin/refunds/RefundTable";

type Props = {
  rows: AdminRefundListRow[];
  capabilities: RefundAdminCapabilities;
  onSelect: (row: AdminRefundListRow) => void;
  onAction: (action: RefundRowAction, row: AdminRefundListRow) => void;
};

export function RefundCardList({ rows, capabilities, onSelect, onAction }: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4" key={row.id}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-cyan-200">{formatRefundId(row.refundId)}</p>
              <p className="mt-1 text-sm text-white">{row.contentLabel ?? "—"}</p>
            </div>
            <RefundStatusBadge status={row.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <div>
              <span className="text-zinc-500">Loại</span>
              <p className="text-zinc-200">{refundTypeLabel(row.refundType)}</p>
            </div>
            <div>
              <span className="text-zinc-500">Coin</span>
              <p className="text-zinc-200">{formatCoin(row.coinAmount)}</p>
            </div>
            <div>
              <span className="text-zinc-500">VND</span>
              <p className="text-zinc-200">{formatVnd(row.amountVnd)}</p>
            </div>
            <div>
              <span className="text-zinc-500">SLA</span>
              <p className="text-zinc-200">{row.slaHours != null ? `${row.slaHours}h` : "—"}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <RefundRiskBadge highRisk={row.isHighRisk} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => onSelect(row)} type="button" variant="secondary">
              Chi tiết
            </Button>
            {row.originalTransactionId ? (
              <Link
                className="rounded-xl border border-white/10 px-3 py-2 text-xs text-cyan-300"
                href={`/admin/transactions?id=${row.originalTransactionId}`}
              >
                Giao dịch gốc
              </Link>
            ) : null}
            {row.kind === "refund" && capabilities.canApprove && row.status === "pending" ? (
              <Button onClick={() => onAction("approve", row)} type="button" variant="ghost">
                Duyệt
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
