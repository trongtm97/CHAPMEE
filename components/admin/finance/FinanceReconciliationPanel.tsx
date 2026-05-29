import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinanceReconciliationSummary, FinanceUrgencyLevel } from "@/types/finance";

const LEVEL_LABEL: Record<FinanceUrgencyLevel, string> = {
  normal: "Bình thường",
  warning: "Cảnh báo",
  danger: "Nguy hiểm"
};

type FinanceReconciliationPanelProps = {
  reconciliation: FinanceReconciliationSummary;
};

export function FinanceReconciliationPanel({ reconciliation }: FinanceReconciliationPanelProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Đối soát thanh toán</h3>
        <Link className="text-sm font-semibold text-cyan-300" href="/admin/payments">
          Mở đối soát →
        </Link>
      </div>
      <p className="text-sm text-zinc-300">
        {reconciliation.pendingCount === 0
          ? "Không có giao dịch chờ đối soát thủ công."
          : `${reconciliation.pendingCount} giao dịch cần đối soát (manual review / thanh toán lệch).`}
      </p>
      <p className="text-xs text-zinc-500">Mức: {LEVEL_LABEL[reconciliation.level]}</p>
    </Card>
  );
}
