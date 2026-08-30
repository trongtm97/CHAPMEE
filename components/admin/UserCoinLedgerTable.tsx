import {
  COIN_LEDGER_TYPE_LABELS,
  COIN_TYPE_LABELS,
  formatLedgerAmount
} from "@/lib/coins/ledger-labels";
import type { UserCoinLedgerEntry } from "@/types/coins";

type UserCoinLedgerTableProps = {
  entries: UserCoinLedgerEntry[];
  emptyMessage?: string;
};

export function UserCoinLedgerTable({
  entries,
  emptyMessage = "Chưa có giao dịch Xu."
}: UserCoinLedgerTableProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <article
          className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm"
          key={entry.id}
        >
          <div className="min-w-0 space-y-1">
            <p className="font-semibold text-zinc-100">
              {entry.type === "refund" &&
              (entry.metadata?.quality_refund || entry.metadata?.description)
                ? "Hoàn Xu"
                : (COIN_LEDGER_TYPE_LABELS[entry.type] ?? entry.type)}
            </p>
            <p className="text-xs text-zinc-500">
              {COIN_TYPE_LABELS[entry.coinType] ?? entry.coinType}
              {entry.metadata?.story_title ? ` · ${String(entry.metadata.story_title)}` : ""}
            </p>
            {entry.description ? <p className="text-sm text-zinc-400">{entry.description}</p> : null}
            <p className="text-xs text-zinc-600">
              {new Date(entry.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>

          <p
            className={`shrink-0 text-sm font-black tabular-nums ${
              entry.direction === "credit" ? "text-emerald-300" : "text-rose-300"
            }`}
          >
            {formatLedgerAmount(entry.direction, entry.coinAmount)}
          </p>
        </article>
      ))}
    </div>
  );
}
