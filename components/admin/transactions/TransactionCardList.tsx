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

export function TransactionCardList({ rows, onSelect }: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <button
          className="w-full rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-cyan-400/30"
          key={row.id}
          onClick={() => onSelect(row.id)}
          type="button"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-xs text-cyan-200">
                {formatShortTransactionCode(row.transaction_code)}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {new Date(row.created_at).toLocaleString("vi-VN")}
              </p>
            </div>
            <TransactionStatusBadge status={row.status} />
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <p className="text-zinc-300">{transactionTypeLabel(row.type)}</p>
            <p className="text-zinc-400">
              {row.userLabel ?? "—"}
              {row.userEmail ? ` · ${row.userEmail}` : ""}
            </p>
            {row.creatorLabel ? <p className="text-zinc-500">Tác giả: {row.creatorLabel}</p> : null}
            {row.relatedContent ? (
              <p className="truncate text-zinc-500">{row.relatedContent}</p>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {formatCoinAmount(row.coin_amount, row.direction)}
            </span>
            <span className="text-sm text-zinc-400">{formatVndAmount(row.money_amount_vnd)}</span>
            <TransactionSourceBadge provider={row.provider} source={row.source} />
            <TransactionRiskBadge compact reasons={row.riskReasons} />
          </div>
        </button>
      ))}
    </div>
  );
}
