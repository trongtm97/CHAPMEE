import { formatAdRevenueDate } from "@/components/studio/ads-revenue/format";
import type { CreatorAdRevenueDashboard } from "@/types/creator-ad-revenue-dashboard";

type CreatorAdRevenuePolicyCardProps = {
  dashboard: CreatorAdRevenueDashboard;
};

export function CreatorAdRevenuePolicyCard({ dashboard }: CreatorAdRevenuePolicyCardProps) {
  const text = dashboard.sharing.policyText?.trim();
  if (!text) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Chính sách hiện hành</h2>
        {dashboard.policyUpdatedAt ? (
          <p className="text-xs text-zinc-500">
            Cập nhật: {formatAdRevenueDate(dashboard.policyUpdatedAt)}
          </p>
        ) : null}
      </div>
      <p className="text-sm text-zinc-400">
        Doanh thu hợp lệ sau khi đối tác quảng cáo chốt. ChapMee đối soát và chi trả theo chính
        sách dưới đây.
      </p>
      <div className="max-h-80 overflow-y-auto rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300 whitespace-pre-wrap">
        {text}
      </div>
    </section>
  );
}
