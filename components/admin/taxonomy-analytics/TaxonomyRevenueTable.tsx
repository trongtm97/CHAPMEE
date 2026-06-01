import { TaxonomyTermTableBase } from "@/components/admin/taxonomy-analytics/TaxonomyTermTableBase";
import type { TaxonomyAnalyticsTermSummary } from "@/types/taxonomy-analytics";

type TaxonomyRevenueTableProps = {
  rows: TaxonomyAnalyticsTermSummary[];
  page: number;
  onPageChange: (next: number) => void;
};

export function TaxonomyRevenueTable({
  rows,
  page,
  onPageChange
}: TaxonomyRevenueTableProps) {
  return <TaxonomyTermTableBase rows={rows} page={page} onPageChange={onPageChange} />;
}
