"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import type { FinanceExportType } from "@/types/finance-export";

const REPORT_TYPES: Array<{ id: FinanceExportType; label: string }> = [
  { id: "transactions", label: "Tổng quan tài chính / Giao dịch" },
  { id: "payouts", label: "Rút tiền" },
  { id: "refunds", label: "Hoàn tiền" },
  { id: "coin_purchases", label: "Coin" },
  { id: "creator_revenue", label: "Doanh thu tác giả" }
];

type ExportFinanceReportModalProps = {
  open: boolean;
  onClose: () => void;
  canExport: boolean;
  defaultFrom?: string;
  defaultTo?: string;
};

export function ExportFinanceReportModal({
  open,
  onClose,
  canExport,
  defaultFrom,
  defaultTo
}: ExportFinanceReportModalProps) {
  const [reportType, setReportType] = useState<FinanceExportType>("transactions");
  const [from, setFrom] = useState(defaultFrom?.slice(0, 10) ?? "");
  const [to, setTo] = useState(defaultTo?.slice(0, 10) ?? "");
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("exportType", reportType);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59`).toISOString());
    return `/api/admin/finance/export?${params.toString()}`;
  }, [from, reportType, to]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-xl">
        <h3 className="text-lg font-black text-white">Xuất báo cáo</h3>
        <p className="mt-1 text-sm text-zinc-400">Tải báo cáo tài chính theo khoảng thời gian.</p>

        {!canExport ? (
          <p className="mt-4 text-sm text-rose-300">Bạn không có quyền xuất báo cáo.</p>
        ) : (
          <div className="mt-4 space-y-3">
            <Field label="Từ ngày">
              <input
                className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                onChange={(e) => setFrom(e.currentTarget.value)}
                type="date"
                value={from}
              />
            </Field>
            <Field label="Đến ngày">
              <input
                className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                onChange={(e) => setTo(e.currentTarget.value)}
                type="date"
                value={to}
              />
            </Field>
            <Field label="Loại báo cáo">
              <select
                className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                onChange={(e) => setReportType(e.currentTarget.value as FinanceExportType)}
                value={reportType}
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Định dạng">
              <select
                className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-sm"
                onChange={(e) => setFormat(e.currentTarget.value as "csv" | "xlsx")}
                value={format}
              >
                <option value="csv">CSV</option>
                <option value="xlsx" disabled>
                  XLSX (sắp có)
                </option>
              </select>
            </Field>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
          {canExport && format === "csv" ? (
            <a href={exportUrl} onClick={onClose}>
              <Button type="button">Tải báo cáo</Button>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-sm text-zinc-300">
      <span>{label}</span>
      {children}
    </label>
  );
}
