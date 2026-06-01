import { formatAdRevenueNumber, formatAdRevenueVnd } from "@/components/studio/ads-revenue/format";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";

const ESTIMATE_DISCLAIMER =
  "Đây là số liệu ước tính nội bộ, có thể thay đổi sau đối soát invalid traffic, thuế/phí và khi ChapMee nhận tiền từ đối tác quảng cáo. Không phải số dư ví và không phải cam kết thanh toán.";

type CreatorAdRevenueEstimateCardProps = {
  dashboard: CreatorAdRevenueDashboard;
};

export function CreatorAdRevenueEstimateCard({ dashboard }: CreatorAdRevenueEstimateCardProps) {
  const { estimate, sharing } = dashboard;

  if (!estimate.visible) {
    return null;
  }

  if (estimate.error) {
    return (
      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <p className="text-sm text-red-200">{estimate.error}</p>
      </section>
    );
  }

  const row = estimate.currentMonth;

  return (
    <section className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/[0.03] p-5 space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Ước tính tháng hiện tại</h2>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-100">
            Ước tính
          </span>
        </div>
        <p className="mt-2 text-sm text-amber-100/80">{ESTIMATE_DISCLAIMER}</p>
      </div>

      {!row || row.rendered_impressions === 0 ? (
        <p className="text-sm text-zinc-500">Chưa có dữ liệu quảng cáo trong kỳ.</p>
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            Kỳ: <span className="text-zinc-300">{row.month}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Impressions (ước tính)" value={formatAdRevenueNumber(row.rendered_impressions)} />
            <Metric label="Gross (ước tính)" value={formatAdRevenueVnd(row.estimated_gross_revenue_vnd)} />
            <Metric
              label="Quỹ tác giả (ước tính)"
              value={formatAdRevenueVnd(row.creator_pool_estimate_vnd)}
            />
            <Metric label="Giữ dự phòng (ước tính)" value={formatAdRevenueVnd(row.reserve_hold_estimate_vnd)} />
            <Metric label="Payable (ước tính)" value={formatAdRevenueVnd(row.estimated_payable_vnd)} highlight />
          </div>
        </>
      )}

      {estimate.settings ? (
        <p className="text-xs text-zinc-500">
          Tham chiếu chính sách: pool {sharing.policy.creator_pool_percent}% · dự phòng{" "}
          {sharing.policy.reserve_percent}% · giữ {sharing.policy.reserve_hold_days} ngày
        </p>
      ) : null}
    </section>
  );
}

function Metric({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-semibold ${highlight ? "text-white" : "text-zinc-200"}`}>
        {value}
      </p>
    </div>
  );
}
