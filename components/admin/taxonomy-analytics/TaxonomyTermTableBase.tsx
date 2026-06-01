import Link from "next/link";
import { TaxonomyPagination } from "@/components/admin/taxonomy/TaxonomyPagination";
import {
  formatMetricNumber,
  formatMetricPct,
  metricTone
} from "@/components/admin/taxonomy-analytics/formatters";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomyAnalyticsTermSummary } from "@/types/taxonomy-analytics";

const PAGE_SIZE = 10;

function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const p = Math.min(totalPages, Math.max(1, page));
  return { rows: items.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), totalPages, page: p };
}

type TaxonomyTermTableBaseProps = {
  rows: TaxonomyAnalyticsTermSummary[];
  page: number;
  onPageChange: (next: number) => void;
};

export function TaxonomyTermTableBase({
  rows,
  page,
  onPageChange
}: TaxonomyTermTableBaseProps) {
  const { rows: paged, totalPages } = paginate(rows, page);

  return (
    <>
      <table className="min-w-full text-left text-sm">
        <thead className="text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-2 py-2">Nhóm</th>
            <th className="px-2 py-2">Term</th>
            <th className="px-2 py-2">Stories</th>
            <th className="px-2 py-2">Impr.</th>
            <th className="px-2 py-2">Clicks</th>
            <th className="px-2 py-2">Starts</th>
            <th className="px-2 py-2">CTR</th>
            <th className="px-2 py-2">Completion</th>
            <th className="px-2 py-2">Revenue</th>
            <th className="px-2 py-2">Trend</th>
            <th className="px-2 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {paged.map((row) => (
            <tr key={row.termId} className="border-t border-white/5">
              <td className="px-2 py-2 text-zinc-400">
                {TAXONOMY_TYPE_LABELS[row.type as keyof typeof TAXONOMY_TYPE_LABELS] ?? row.type}
              </td>
              <td className="px-2 py-2 font-medium">{row.termName}</td>
              <td className="px-2 py-2">{formatMetricNumber(row.activeStories)}</td>
              <td className="px-2 py-2">{formatMetricNumber(row.impressions)}</td>
              <td className="px-2 py-2">{formatMetricNumber(row.clicks)}</td>
              <td className="px-2 py-2">{formatMetricNumber(row.storyStarts)}</td>
              <td className="px-2 py-2">{formatMetricPct(row.ctr)}</td>
              <td className="px-2 py-2">{formatMetricPct(row.completionRate)}</td>
              <td className="px-2 py-2">{formatMetricNumber(row.revenueCoin)}</td>
              <td className={`px-2 py-2 ${metricTone(row.storyStartsGrowthPct)}`}>
                {formatMetricPct(row.storyStartsGrowthPct)}
              </td>
              <td className="px-2 py-2">
                <Link className="text-cyan-300 hover:text-cyan-200" href="/admin/taxonomy">
                  Xem audit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3">
        <TaxonomyPagination
          onPageChange={onPageChange}
          page={page}
          total={rows.length}
          totalPages={totalPages}
        />
      </div>
    </>
  );
}
