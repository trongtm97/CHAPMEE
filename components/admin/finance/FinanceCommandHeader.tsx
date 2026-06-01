"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ExportFinanceReportModal } from "@/components/admin/finance/ExportFinanceReportModal";
import type { FinanceAuditAction } from "@/lib/admin/finance-audit";
import type { FinanceCapabilities } from "@/types/finance";

function logNavAudit(action: FinanceAuditAction) {
  void fetch("/api/admin/finance/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action })
  });
}

type FinanceCommandHeaderProps = {
  capabilities: FinanceCapabilities;
  rangeFrom: string | null;
  rangeTo: string | null;
};

export function FinanceCommandHeader({
  capabilities,
  rangeFrom,
  rangeTo
}: FinanceCommandHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <>
      <div>
        <Link className="text-sm font-semibold text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-normal text-white">
          Tổng quan tài chính
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-zinc-400">
          Theo dõi doanh thu, coin, ví tác giả, rút tiền, hoàn tiền và rủi ro dòng tiền trên
          ChapMee.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {capabilities.canExportReports ? (
            <Button onClick={() => setExportOpen(true)} type="button">
              Xuất báo cáo
            </Button>
          ) : null}
          {capabilities.canViewTransactions ? (
            <Link href="/admin/transactions" onClick={() => logNavAudit("finance_transaction_opened")}>
              <Button type="button" variant="ghost">
                Xem giao dịch
              </Button>
            </Link>
          ) : null}
          {capabilities.canViewPayouts ? (
            <Link href="/admin/withdrawals" onClick={() => logNavAudit("finance_payout_queue_opened")}>
              <Button type="button" variant="ghost">
                Quản lý rút tiền
              </Button>
            </Link>
          ) : null}
          {capabilities.canViewRefunds ? (
            <Link href="/admin/refunds" onClick={() => logNavAudit("finance_refund_queue_opened")}>
              <Button type="button" variant="ghost">
                Quản lý hoàn tiền
              </Button>
            </Link>
          ) : null}
          <Link href="/admin/creator-fee-policies">
            <Button type="button" variant="ghost">
              Chính sách phí tác giả
            </Button>
          </Link>
          <Link href="/admin/payments" onClick={() => logNavAudit("payment_reconciliation_opened")}>
            <Button type="button" variant="ghost">
              Đối soát thanh toán
            </Button>
          </Link>
        </div>
      </div>

      <ExportFinanceReportModal
        canExport={capabilities.canExportReports}
        defaultFrom={rangeFrom ?? undefined}
        defaultTo={rangeTo ?? undefined}
        onClose={() => setExportOpen(false)}
        open={exportOpen}
      />
    </>
  );
}
