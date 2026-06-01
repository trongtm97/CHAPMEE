import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import type { TaxonomyAnalyticsPageData } from "@/types/taxonomy-analytics";

type TaxonomyInsightSummaryProps = {
  insights: TaxonomyAnalyticsPageData["insights"];
};

export function TaxonomyInsightSummary({ insights }: TaxonomyInsightSummaryProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Tóm tắt insight</h2>
      {insights.length === 0 ? (
        <EmptyAnalyticsState
          description="Hệ thống sẽ hiển thị sau khi có lượt xem, lượt đọc và taxonomy usage."
          title="Chưa đủ dữ liệu để tạo insight."
        />
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          {insights.slice(0, 5).map((insight) => (
            <li key={insight.id}>• {insight.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
