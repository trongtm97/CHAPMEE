"use client";

import Link from "next/link";
import {
  formatCoin,
  formatRefundId,
  formatVnd,
  refundTypeLabel
} from "@/lib/admin/refunds/refund-labels";
import type { AdminRefundListRow, RefundAdminCapabilities } from "@/types/admin-refund";
import { RefundKindBadge, RefundRiskBadge, RefundStatusBadge } from "@/components/admin/refunds/RefundBadges";
import { Button } from "@/components/ui";

export type RefundRowAction =
  | "detail"
  | "approve"
  | "reject"
  | "processing"
  | "complete"
  | "failed";

type Props = {
  rows: AdminRefundListRow[];
  selectedId: string | null;
  capabilities: RefundAdminCapabilities;
  onSelect: (row: AdminRefundListRow) => void;
  onAction: (action: RefundRowAction, row: AdminRefundListRow) => void;
};

export function RefundTable({ rows, selectedId, capabilities, onSelect, onAction }: Props) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3">Refund ID</th>
            <th className="px-4 py-3">Người mua</th>
            <th className="px-4 py-3">Tác giả</th>
            <th className="px-4 py-3">Nội dung / giao dịch</th>
            <th className="px-4 py-3">Loại hoàn</th>
            <th className="px-4 py-3 text-right">Coin</th>
            <th className="px-4 py-3 text-right">VND</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Lý do</th>
            <th className="px-4 py-3">Người tạo</th>
            <th className="px-4 py-3">Ngày tạo</th>
            <th className="px-4 py-3">SLA</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className={`border-t border-white/5 ${
                selectedId === row.id ? "bg-cyan-500/10" : "hover:bg-white/[0.02]"
              }`}
              key={row.id}
            >
              <td className="px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xs text-cyan-200">{formatRefundId(row.refundId)}</span>
                  <RefundKindBadge kind={row.kind} />
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-200">
                {row.buyerUsername ? `@${row.buyerUsername}` : row.kind === "quality_batch" ? `${row.coinAmount > 0 ? "Nhiều người" : "—"}` : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-300">
                {row.creatorUsername ? `@${row.creatorUsername}` : "—"}
              </td>
              <td className="px-4 py-3">
                <p className="text-zinc-200">{row.contentLabel ?? "—"}</p>
                {row.originalTransactionId ? (
                  <Link
                    className="text-xs text-cyan-400 hover:text-cyan-300"
                    href={`/admin/transactions?id=${row.originalTransactionId}`}
                  >
                    TX {row.originalTransactionId.slice(0, 8)}
                  </Link>
                ) : null}
              </td>
              <td className="px-4 py-3 text-zinc-300">{refundTypeLabel(row.refundType)}</td>
              <td className="px-4 py-3 text-right text-white">{formatCoin(row.coinAmount)}</td>
              <td className="px-4 py-3 text-right text-zinc-300">{formatVnd(row.amountVnd)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <RefundStatusBadge status={row.status} />
                  <RefundRiskBadge highRisk={row.isHighRisk} />
                </div>
              </td>
              <td className="max-w-[140px] truncate px-4 py-3 text-zinc-400" title={row.reason ?? ""}>
                {row.reason ?? "—"}
              </td>
              <td className="px-4 py-3 text-zinc-400">{row.createdByUsername ?? "—"}</td>
              <td className="px-4 py-3 text-zinc-400">
                {new Date(row.createdAt).toLocaleString("vi-VN")}
              </td>
              <td className="px-4 py-3 text-zinc-400">
                {row.slaHours != null ? `${row.slaHours}h` : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-1">
                  <Button onClick={() => onSelect(row)} type="button" variant="secondary">
                    Chi tiết
                  </Button>
                  {row.kind === "refund" && capabilities.canApprove && row.status === "pending" ? (
                    <Button onClick={() => onAction("approve", row)} type="button" variant="ghost">
                      Duyệt
                    </Button>
                  ) : null}
                  {row.kind === "refund" && capabilities.canReject && row.status === "pending" ? (
                    <Button onClick={() => onAction("reject", row)} type="button" variant="ghost">
                      Từ chối
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
