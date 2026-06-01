import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import {
  formatMetricNumber,
  formatMetricPct
} from "@/components/admin/taxonomy-analytics/formatters";
import type { TaxonomySurfaceContribution } from "@/types/taxonomy-analytics";

type TaxonomySurfaceContributionTableProps = {
  rows: TaxonomySurfaceContribution[];
};

export function TaxonomySurfaceContributionTable({
  rows
}: TaxonomySurfaceContributionTableProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">Discover / Search / Reels contribution</h2>
      {rows.length === 0 ? (
        <EmptyAnalyticsState
          title="Chưa có dữ liệu đóng góp theo surface."
          description="Các surface sẽ hiện khi có aggregate event cho kỳ đã chọn."
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-2 py-2">Surface</th>
                <th className="px-2 py-2">Impressions</th>
                <th className="px-2 py-2">Share</th>
                <th className="px-2 py-2">Clicks</th>
                <th className="px-2 py-2">Starts</th>
                <th className="px-2 py-2">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.surface} className="border-t border-white/5">
                  <td className="px-2 py-2">{row.surface}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.impressions)}</td>
                  <td className="px-2 py-2">{formatMetricPct(row.impressionsShare)}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.clicks)}</td>
                  <td className="px-2 py-2">{formatMetricNumber(row.storyStarts)}</td>
                  <td className="px-2 py-2">{formatMetricPct(row.ctr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
