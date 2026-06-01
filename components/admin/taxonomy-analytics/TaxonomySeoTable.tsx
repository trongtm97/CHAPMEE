import Link from "next/link";
import { EmptyAnalyticsState } from "@/components/admin/taxonomy-analytics/EmptyAnalyticsState";
import { TAXONOMY_TYPE_LABELS } from "@/lib/taxonomy/constants";
import type { TaxonomySeoPageMetric } from "@/types/taxonomy-analytics";

type TaxonomySeoTableProps = {
  rows: TaxonomySeoPageMetric[];
  canManageSeo: boolean;
};

export function TaxonomySeoTable({ rows, canManageSeo }: TaxonomySeoTableProps) {
  return (
    <section className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
      <h2 className="text-base font-semibold">SEO taxonomy pages</h2>
      {rows.length === 0 ? (
        <EmptyAnalyticsState
          title="Chưa có dữ liệu SEO taxonomy pages."
          description="Chưa có lượt xem taxonomy pages hoặc chưa có term SEO public."
        />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-2 py-2">Group</th>
                <th className="px-2 py-2">Term</th>
                <th className="px-2 py-2">URL</th>
                <th className="px-2 py-2">Index</th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">Meta</th>
                <th className="px-2 py-2">Thin</th>
                <th className="px-2 py-2">Duplicate</th>
                <th className="px-2 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row) => (
                <tr key={row.termId} className="border-t border-white/5">
                  <td className="px-2 py-2 text-zinc-400">
                    {TAXONOMY_TYPE_LABELS[row.type as keyof typeof TAXONOMY_TYPE_LABELS] ?? row.type}
                  </td>
                  <td className="px-2 py-2">{row.termName}</td>
                  <td className="px-2 py-2 text-cyan-300">{row.landingUrl}</td>
                  <td className="px-2 py-2">{row.indexable ? "index" : "noindex"}</td>
                  <td className="px-2 py-2">{row.seoTitlePresent ? "OK" : "Thiếu"}</td>
                  <td className="px-2 py-2">{row.seoDescriptionPresent ? "OK" : "Thiếu"}</td>
                  <td className="px-2 py-2">{row.lowContent ? "Cảnh báo" : "—"}</td>
                  <td className="px-2 py-2">
                    {row.duplicateRisk ? `Có (${row.duplicateCount})` : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      className="text-cyan-300 hover:text-cyan-200"
                      href={canManageSeo ? "/admin/seo?tab=taxonomy" : "/admin/seo"}
                    >
                      Mở SEO
                    </Link>
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
