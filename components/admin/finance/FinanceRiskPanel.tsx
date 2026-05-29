"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import type { FinanceExtendedRisk, FinanceUrgencyLevel } from "@/types/finance";

type FinanceRiskPanelProps = {
  risk: FinanceExtendedRisk;
  canView: boolean;
};

function levelFor(count: number): FinanceUrgencyLevel {
  if (count >= 5) return "danger";
  if (count >= 1) return "warning";
  return "normal";
}

const LEVEL_LABEL: Record<FinanceUrgencyLevel, string> = {
  normal: "Bình thường",
  warning: "Cần xem",
  danger: "Nguy hiểm"
};

export function FinanceRiskPanel({ risk, canView }: FinanceRiskPanelProps) {
  if (!canView) {
    return (
      <Card>
        <p className="text-sm text-zinc-400">Bạn không có quyền xem rủi ro tài chính.</p>
      </Card>
    );
  }

  const items = [
    { label: "Giao dịch nghi ngờ", count: risk.suspiciousTransactions },
    { label: "Sổ coin lệch", count: risk.coinLedgerMismatch },
    { label: "Tác giả bị khóa rút tiền", count: risk.payoutBlockedAuthors },
    { label: "Hoàn tiền bất thường", count: risk.abnormalRefunds },
    { label: "Người dùng nạp nhiều bất thường", count: risk.abnormalTopupUsers },
    { label: "Người dùng nhận coin thưởng bất thường", count: risk.abnormalBonusRecipients },
    { label: "Chargeback mở", count: risk.openChargebacks },
    { label: "Payout bị chặn", count: risk.blockedPayouts }
  ];

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-black text-white">Rủi ro tài chính</h3>
        <Link
          className="text-sm font-semibold text-cyan-300"
          href="/admin/risk"
          onClick={() => {
            void fetch("/api/admin/finance/audit", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "finance_risk_dashboard_opened" })
            });
          }}
        >
          Mở dashboard rủi ro
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => {
          const level = levelFor(item.count);
          return (
            <div
              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
              key={item.label}
            >
              <span className="text-sm text-zinc-300">{item.label}</span>
              <span className="text-sm">
                <span className="font-semibold text-white">{item.count}</span>
                <span className="ml-2 text-xs text-zinc-500">{LEVEL_LABEL[level]}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
