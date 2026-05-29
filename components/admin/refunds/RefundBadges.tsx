import { refundStatusLabel } from "@/lib/admin/refunds/refund-labels";

export function RefundStatusBadge({ status }: { status: string }) {
  const label = refundStatusLabel(status);
  const tone =
    status === "completed"
      ? "bg-emerald-500/15 text-emerald-200"
      : status === "rejected"
        ? "bg-rose-500/15 text-rose-200"
        : status === "failed"
          ? "bg-red-900/40 text-red-200"
          : status === "processing"
            ? "bg-orange-500/15 text-orange-200"
            : status === "approved"
              ? "bg-violet-500/15 text-violet-200"
              : status === "reviewing"
                ? "bg-blue-500/15 text-blue-200"
                : status === "pending"
                  ? "bg-amber-500/15 text-amber-200"
                  : status === "cancelled"
                    ? "bg-zinc-500/20 text-zinc-400"
                    : "bg-zinc-500/20 text-zinc-300";

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

export function RefundRiskBadge({ highRisk }: { highRisk: boolean }) {
  if (!highRisk) return null;
  return (
    <span className="inline-flex rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-200">
      Rủi ro cao
    </span>
  );
}

export function RefundKindBadge({ kind }: { kind: "refund" | "quality_batch" }) {
  if (kind === "quality_batch") {
    return (
      <span className="inline-flex rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-200">
        Batch chất lượng
      </span>
    );
  }
  return null;
}
