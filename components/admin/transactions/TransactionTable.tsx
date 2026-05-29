"use client";

import {
  formatCoinAmount,
  formatShortTransactionCode,
  formatVndAmount,
  transactionTypeLabel
} from "@/lib/admin/transactions/transaction-labels";
import type { AdminTransactionListRow } from "@/types/admin-transaction";
import {
  TransactionRiskBadge,
  TransactionSourceBadge,
  TransactionStatusBadge
} from "@/components/admin/transactions/TransactionBadges";

type Props = {
  rows: AdminTransactionListRow[];
  onSelect: (id: string) => void;
};

export function TransactionTable({ rows, onSelect }: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2.5">Thời gian</th>
            <th className="px-3 py-2.5">Mã giao dịch</th>
            <th className="px-3 py-2.5">Loại</th>
            <th className="px-3 py-2.5">Người dùng</th>
            <th className="px-3 py-2.5">Tác giả</th>
            <th className="px-3 py-2.5">Nội dung liên quan</th>
            <th className="px-3 py-2.5">Coin</th>
            <th className="px-3 py-2.5">Tiền VND</th>
            <th className="px-3 py-2.5">Trạng thái</th>
            <th className="px-3 py-2.5">Nguồn</th>
            <th className="px-3 py-2.5">Cảnh báo</th>
            <th className="px-3 py-2.5">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="border-t border-white/10 text-zinc-200 transition hover:bg-white/[0.02]"
              key={row.id}
            >
              <td className="px-3 py-2.5 text-zinc-400">
                {new Date(row.created_at).toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs">
                {formatShortTransactionCode(row.transaction_code)}
              </td>
              <td className="px-3 py-2.5">{transactionTypeLabel(row.type)}</td>
              <td className="px-3 py-2.5">
                <div>{row.userLabel ?? "—"}</div>
                {row.userEmail ? (
                  <div className="text-xs text-zinc-500">{row.userEmail}</div>
                ) : null}
              </td>
              <td className="px-3 py-2.5">{row.creatorLabel ?? "—"}</td>
              <td className="max-w-[180px] truncate px-3 py-2.5" title={row.relatedContent ?? ""}>
                {row.relatedContent ?? "—"}
              </td>
              <td className="px-3 py-2.5">{formatCoinAmount(row.coin_amount, row.direction)}</td>
              <td className="px-3 py-2.5">{formatVndAmount(row.money_amount_vnd)}</td>
              <td className="px-3 py-2.5">
                <TransactionStatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2.5">
                <TransactionSourceBadge provider={row.provider} source={row.source} />
              </td>
              <td className="px-3 py-2.5">
                <TransactionRiskBadge reasons={row.riskReasons} />
              </td>
              <td className="px-3 py-2.5">
                <button
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  onClick={() => onSelect(row.id)}
                  type="button"
                >
                  Chi tiết
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
