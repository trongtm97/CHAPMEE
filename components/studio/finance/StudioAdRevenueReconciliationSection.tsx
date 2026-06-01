"use client";

import type { CreatorReconciledAdRevenueMonth } from "@/types/ad-revenue-reconciliation";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

type StudioAdRevenueReconciliationSectionProps = {
  months: CreatorReconciledAdRevenueMonth[];
  estimatesVisible: boolean;
};

export function StudioAdRevenueReconciliationSection({
  months,
  estimatesVisible
}: StudioAdRevenueReconciliationSectionProps) {
  const reconciled = months.filter((m) => m.label === "reconciled");
  const estimates = months.filter((m) => m.label === "estimate");

  if (reconciled.length === 0 && estimates.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Doanh thu QC đã đối soát</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Số liệu đã khóa kỳ dựa trên doanh thu đối tác quảng cáo hợp lệ — không phải ước tính RPM
          thô. ChapMee chưa chuyển tiền vào ví; đây là số payable sau đối soát.
        </p>
      </div>

      {reconciled.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Tháng</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2">Phân bổ gross</th>
                <th className="px-3 py-2">Giữ dự phòng</th>
                <th className="px-3 py-2">Payable</th>
                <th className="px-3 py-2">Mở giữ dự phòng (dự kiến)</th>
              </tr>
            </thead>
            <tbody>
              {reconciled.map((row) => {
                const statusBadge =
                  row.displayStatus === "under_review" ? (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
                      Đang giữ để kiểm tra
                    </span>
                  ) : row.displayStatus === "cancelled" ? (
                    <span className="rounded-full bg-zinc-500/20 px-2 py-0.5 text-xs text-zinc-400">
                      Không tính thanh toán
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
                      Đã đối soát
                    </span>
                  );
                return (
                  <tr key={`rec-${row.month}`} className="border-b border-white/5 text-zinc-300">
                    <td className="px-3 py-2">{row.month}</td>
                    <td className="px-3 py-2">{statusBadge}</td>
                    <td className="px-3 py-2">{formatVnd(row.grossAllocatedVnd)}</td>
                    <td className="px-3 py-2">{formatVnd(row.reserveHoldVnd)}</td>
                    <td className="px-3 py-2 font-medium text-white">
                      {formatVnd(row.finalPayableVnd)}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {formatDate(row.reserveReleaseAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Chưa có tháng nào được ChapMee khóa đối soát cho tài khoản của bạn.
        </p>
      )}

      {reconciled.some((r) => r.statusMessage && r.displayStatus !== "paid_track") ? (
        <div className="space-y-2">
          {reconciled
            .filter((r) => r.statusMessage && r.displayStatus !== "paid_track")
            .map((r) => (
              <p
                key={`msg-${r.month}`}
                className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-100/90"
              >
                <span className="font-medium">{r.month}:</span> {r.statusMessage}
              </p>
            ))}
        </div>
      ) : null}

      {estimatesVisible && estimates.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-300">Ước tính (chưa đối soát)</h3>
          <p className="text-xs text-amber-200/80">
            Các tháng dưới đây chỉ mang tính tham khảo nội bộ, không phải cam kết thanh toán.
          </p>
          <ul className="space-y-1 text-sm text-zinc-500">
            {estimates.slice(0, 6).map((row) => (
              <li key={`est-${row.month}`}>
                {row.month}: payable ước tính {formatVnd(row.finalPayableVnd)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
