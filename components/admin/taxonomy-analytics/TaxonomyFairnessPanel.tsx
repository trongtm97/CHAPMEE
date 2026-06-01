import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import { formatMetricPct } from "@/components/admin/taxonomy-analytics/formatters";
import type { TaxonomyFairnessData } from "@/types/taxonomy-analytics";

type TaxonomyFairnessPanelProps = {
  fairness: TaxonomyFairnessData;
};

export function TaxonomyFairnessPanel({ fairness }: TaxonomyFairnessPanelProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Công bằng phân phối theo taxonomy</h2>
      {fairness.topTaxonomyConcentration.length === 0 ? (
        <EmptyAnalyticsState
          title="Chưa đủ dữ liệu để đánh giá concentration."
          description="Hệ thống sẽ hiển thị sau khi có đủ dữ liệu phân phối impressions theo taxonomy."
        />
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {fairness.topTaxonomyConcentration.map((row) => (
            <div
              key={row.termId}
              className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="font-medium">{row.termName}</span> · {formatMetricPct(row.share)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
