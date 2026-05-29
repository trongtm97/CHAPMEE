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
  emptyMessage = "Chưa có giao dịch coin."
}: UserCoinLedgerTableProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <article
          className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5 text-sm"
          key={entry.id}
        >
          <div className="min-w-0">
            <p className="font-semibold text-zinc-100">
              {entry.type === "refund" &&
              (entry.metadata?.quality_refund || entry.metadata?.description)
                ? "Hoàn coin"
                : (COIN_LEDGER_TYPE_LABELS[entry.type] ?? entry.type)}
            </p>
            <p className="text-xs text-zinc-500">
              {COIN_TYPE_LABELS[entry.coinType] ?? entry.coinType}
              {" · "}
              {entry.type === "refund" && entry.metadata?.quality_refund
                ? "Bạn được hoàn coin do nội dung đã mua được ChapMee xử lý chất lượng."
                : entry.description
                  ? entry.description
                  : ""}
              {entry.metadata?.story_title
                ? ` · ${String(entry.metadata.story_title)}`
                : ""}
            </p>
            <p className="text-xs text-zinc-600">
              {new Date(entry.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <p
            className={`shrink-0 font-bold ${
              entry.direction === "credit" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {formatLedgerAmount(entry.direction, entry.coinAmount)}
          </p>
        </article>
      ))}
    </div>
  );
}
