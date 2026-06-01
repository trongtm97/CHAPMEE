import Link from "next/link";
import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import {
  formatMetricNumber,
  formatMetricPct
} from "@/components/admin/taxonomy-analytics/formatters";
import type { TaxonomyCreatorContribution } from "@/types/taxonomy-analytics";

type TaxonomyCreatorContributionTableProps = {
  rows: TaxonomyCreatorContribution[];
};

export function TaxonomyCreatorContributionTable({
  rows
}: TaxonomyCreatorContributionTableProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Creator contribution theo taxonomy</h2>
      {rows.length === 0 ? (
        <EmptyAnalyticsState
          title="Chưa có dữ liệu creator contribution."
          description="Cần thêm aggregate creator taxonomy để đánh giá coverage và concentration."
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-2 py-2">Creator</th>
                <th className="px-2 py-2">Coverage</th>
                <th className="px-2 py-2">Impr.</th>
                <th className="px-2 py-2">Starts</th>
                <th className="px-2 py-2">Completion</th>
                <th className="px-2 py-2">Revenue</th>
                <th className="px-2 py-2">Warning</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((row) => (
                <tr key={row.creatorId} className="border-t border-white/5">
                  <td className="px-2 py-2">
                    <div>{row.creatorName}</div>
                    {row.creatorHandle ? (
                      <Link
                        className="text-xs text-cyan-300 hover:text-cyan-200"
                        href={`/@${row.creatorHandle}`}
                      >
                        /@{row.creatorHandle}
                      </Link>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">{row.coverageTaxonomyCount}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.impressions)}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.starts)}</td>
                  <td className="px-2 py-2">{formatMetricPct(row.completionRate)}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.revenueCoin)}</td>
                  <td className="px-2 py-2">
                    {row.warning ? "Creator concentration high" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
