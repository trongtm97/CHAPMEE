import type { PayoutRequestStatus } from "@/types/payout";
import type { WithdrawalRiskLevel } from "@/types/admin-withdrawal";
import { withdrawalStatusLabel } from "@/lib/admin/withdrawals/withdrawal-labels";

export function WithdrawalStatusBadge({ status }: { status: PayoutRequestStatus }) {
  const label = withdrawalStatusLabel(status);
  const tone =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-200"
      : status === "rejected" || status === "cancelled"
        ? "bg-rose-500/15 text-rose-200"
        : status === "failed"
          ? "bg-orange-500/15 text-orange-200"
          : status === "processing"
            ? "bg-amber-500/15 text-amber-200"
            : status === "approved"
              ? "bg-cyan-500/15 text-cyan-200"
              : "bg-zinc-500/20 text-zinc-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function WithdrawalRiskBadge({ level }: { level: WithdrawalRiskLevel }) {
  const tone =
    level === "high"
      ? "bg-rose-500/20 text-rose-200"
      : level === "warning"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-emerald-500/15 text-emerald-200";
  const label = level === "high" ? "Rủi ro cao" : level === "warning" ? "Cảnh báo" : "Bình thường";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}
