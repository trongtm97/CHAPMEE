import {
  riskBadgeClass,
  sourceBadgeClass,
  statusBadgeClass,
  transactionRiskLabel,
  transactionSourceLabel,
  transactionStatusLabel
} from "@/lib/admin/transactions/transaction-labels";
import type { TransactionRiskReason } from "@/types/admin-transaction";

export function TransactionStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(status)}`}
    >
      {transactionStatusLabel(status)}
    </span>
  );
}

export function TransactionSourceBadge({
  source,
  provider
}: {
  source: string;
  provider?: string | null;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sourceBadgeClass()}`}
    >
      {transactionSourceLabel(source, provider)}
    </span>
  );
}

export function TransactionRiskBadge({
  reasons,
  compact = false
}: {
  reasons: TransactionRiskReason[];
  compact?: boolean;
}) {
  if (reasons.length === 0) {
    return compact ? null : <span className="text-zinc-500">—</span>;
  }

  const primary = reasons.includes("manual_review") ? "manual_review" : reasons[0];

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${riskBadgeClass()}`}
      title={reasons.map(transactionRiskLabel).join(", ")}
    >
      {transactionRiskLabel(primary)}
      {!compact && reasons.length > 1 ? ` +${reasons.length - 1}` : null}
    </span>
  );
}
