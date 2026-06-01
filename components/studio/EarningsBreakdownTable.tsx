"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { EarningTransactionDetailModal } from "@/components/studio/EarningTransactionDetailModal";
import type { EarningsBreakdownRow, EarningsPeriodFilter } from "@/types/finance";

const FILTERS: { id: EarningsPeriodFilter; label: string }[] = [
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
  { id: "90d", label: "90 ngày" },
  { id: "all", label: "Tất cả" }
];

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type EarningsBreakdownTableProps = {
  rows: EarningsBreakdownRow[];
  activeFilter: EarningsPeriodFilter;
};

export function EarningsBreakdownTable({ rows, activeFilter }: EarningsBreakdownTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailId, setDetailId] = useState<string | null>(null);

  function setFilter(filter: EarningsPeriodFilter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", filter);
    router.replace(`?${params.toString()}`);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white">Lịch sử doanh thu</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                activeFilter === f.id
                  ? "bg-sky-500 text-white"
                  : "border border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">Chưa có giao dịch doanh thu trong khoảng này.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs text-zinc-500">
                <th className="pb-2 pr-3 font-medium">Thời gian</th>
                <th className="pb-2 pr-3 font-medium">Loại</th>
                <th className="pb-2 pr-3 font-medium">Truyện / chương</th>
                <th className="pb-2 pr-3 font-medium text-right">Doanh thu gộp</th>
                <th className="pb-2 pr-3 font-medium text-right">ChapMee giữ</th>
                <th className="pb-2 pr-3 font-medium text-right">Tác giả nhận</th>
                <th className="pb-2 pr-3 font-medium">Trạng thái</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 text-zinc-200">
                  <td className="py-2 pr-3 text-xs text-zinc-400">{formatDate(row.createdAt)}</td>
                  <td className="py-2 pr-3">{row.sourceLabel}</td>
                  <td className="py-2 pr-3">{row.contentLabel}</td>
                  <td className="py-2 pr-3 text-right">{formatVnd(row.grossVnd)}</td>
                  <td className="py-2 pr-3 text-right text-amber-200/90">
                    {formatVnd(row.platformFeeVnd)}
                  </td>
                  <td className="py-2 pr-3 text-right font-semibold text-emerald-200">
                    {formatVnd(row.creatorNetVnd)}
                  </td>
                  <td className="py-2 pr-3 text-xs capitalize text-zinc-400">{row.status}</td>
                  <td className="py-2">
                    <button
                      type="button"
                      onClick={() => setDetailId(row.id)}
                      className="text-xs font-semibold text-sky-300 hover:text-sky-200"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EarningTransactionDetailModal
        earningTransactionId={detailId}
        onClose={() => setDetailId(null)}
      />
    </section>
  );
}
