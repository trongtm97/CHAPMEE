"use client";

import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { formatMonetizationVnd } from "@/lib/studio/format-monetization-display";
import {
  MonetizationBadge,
  transactionKindTone
} from "@/components/studio/monetization/monetization-ui";
import type { StudioMonetizationRecentTransaction } from "@/types/studio-monetization";

type MonetizationRecentTransactionsProps = {
  transactions: StudioMonetizationRecentTransaction[];
  coinDisplayName: string;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MonetizationRecentTransactions({
  transactions
}: MonetizationRecentTransactionsProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/40">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Giao dịch gần đây</h2>
        <Link
          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
          href="/studio/monetization?tab=transactions"
        >
          Xem tất cả
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="px-4 py-6">
          <EmptyState
            description="Giao dịch tip và mở khóa sẽ hiện tại mục Tài chính."
            title="Chưa có giao dịch"
          />
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {transactions.map((tx) => {
            const kind = tx.kind ?? "other";
            const tone = transactionKindTone(kind);
            return (
              <li className="flex items-center justify-between gap-3 px-4 py-3" key={tx.id}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <MonetizationBadge tone={tone}>{tx.typeLabel}</MonetizationBadge>
                    <span className="text-xs text-zinc-500">{tx.statusLabel}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {tx.contentLabel} · {formatDate(tx.createdAt)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-white">
                  {formatMonetizationVnd(tx.amountVnd)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
