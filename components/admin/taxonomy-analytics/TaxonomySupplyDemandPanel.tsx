import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import { TaxonomyTermTableBase } from "@/components/admin/taxonomy-analytics/TaxonomyTermTableBase";
import type { TaxonomyAnalyticsTermSummary } from "@/types/taxonomy-analytics";

type TaxonomySupplyDemandPanelProps = {
  highSupplyLowDemand: TaxonomyAnalyticsTermSummary[];
  lowSupplyHighRetention: TaxonomyAnalyticsTermSummary[];
};

export function TaxonomySupplyDemandPanel({
  highSupplyLowDemand,
  lowSupplyHighRetention
}: TaxonomySupplyDemandPanelProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-base font-semibold">High supply · low demand</h2>
        <p className="mt-1 text-sm text-zinc-400">Taxonomy dư cung nhưng nhu cầu thấp.</p>
        {highSupplyLowDemand.length === 0 ? (
          <EmptyAnalyticsState
            title="Không phát hiện dư cung rõ rệt."
            description="Không có taxonomy đạt điều kiện dư cung trong bộ lọc hiện tại."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <TaxonomyTermTableBase rows={highSupplyLowDemand} page={1} onPageChange={() => undefined} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
        <h2 className="text-base font-semibold">Low supply · high retention</h2>
        <p className="mt-1 text-sm text-zinc-400">Taxonomy ít cung nhưng giữ chân tốt.</p>
        {lowSupplyHighRetention.length === 0 ? (
          <EmptyAnalyticsState
            title="Chưa có cơ hội low-supply rõ rệt."
            description="Cần thêm dữ liệu để phát hiện taxonomy ít truyện nhưng retention cao."
          />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <TaxonomyTermTableBase rows={lowSupplyHighRetention} page={1} onPageChange={() => undefined} />
          </div>
        )}
      </section>
    </section>
  );
}
