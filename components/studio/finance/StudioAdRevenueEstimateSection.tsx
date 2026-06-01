"use client";

import type { CreatorAdRevenueEstimate } from "@/types/ad-revenue";

const CREATOR_DISCLAIMER =
  "Đây là số liệu ước tính, có thể thay đổi sau đối soát invalid traffic, thuế/phí và thanh toán từ đối tác quảng cáo. Không phải số dư ví và không phải cam kết thanh toán.";

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(Math.round(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

const STATUS_LABELS: Record<string, string> = {
  estimate: "Ước tính",
  locked: "Đã khóa",
  reconciled: "Đã đối soát",
  adjusted: "Đã điều chỉnh"
};

type StudioAdRevenueEstimateSectionProps = {
  data: CreatorAdRevenueEstimate;
};

export function StudioAdRevenueEstimateSection({ data }: StudioAdRevenueEstimateSectionProps) {
  if (data.months.length === 0) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
        <h2 className="text-lg font-semibold text-white">Doanh thu quảng cáo (ước tính)</h2>
        <p className="text-sm text-zinc-400">{CREATOR_DISCLAIMER}</p>
        <p className="text-sm text-zinc-500">
          Chưa có số liệu ước tính cho tài khoản của bạn. Số liệu sẽ xuất hiện sau khi có lượt
          hiển thị quảng cáo trên nội dung của bạn và admin rebuild metrics.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Doanh thu quảng cáo (ước tính)</h2>
        <p className="mt-2 text-sm text-amber-200/80">{CREATOR_DISCLAIMER}</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Tháng</th>
              <th className="px-3 py-2">Impressions</th>
              <th className="px-3 py-2">Gross ước tính</th>
              <th className="px-3 py-2">Pool ước tính</th>
              <th className="px-3 py-2">Reserve</th>
              <th className="px-3 py-2">Payable ước tính</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {data.months.map((row) => (
              <tr className="border-t border-white/5 text-zinc-200" key={row.id}>
                <td className="px-3 py-2 font-medium">{row.month}</td>
                <td className="px-3 py-2">{formatNumber(row.rendered_impressions)}</td>
                <td className="px-3 py-2">{formatVnd(row.estimated_gross_revenue_vnd)}</td>
                <td className="px-3 py-2">{formatVnd(row.creatorPoolEstimateVnd)}</td>
                <td className="px-3 py-2">{formatVnd(row.reserve_hold_vnd)}</td>
                <td className="px-3 py-2">{formatVnd(row.estimated_payable_vnd)}</td>
                <td className="px-3 py-2 text-zinc-400">
                  {STATUS_LABELS[row.status] ?? row.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-zinc-500">
        Ngưỡng rút tối thiểu (tham khảo): {formatVnd(data.settings.min_payout_vnd)} · Pool{" "}
        {data.settings.creator_pool_percent}% · Reserve {data.settings.reserve_percent}%
      </p>
    </section>
  );
}
