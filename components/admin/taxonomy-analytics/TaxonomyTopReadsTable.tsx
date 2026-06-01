import { TaxonomyTermTableBase } from "@/components/admin/taxonomy-analytics/TaxonomyTermTableBase";
import type { TaxonomyAnalyticsTermSummary } from "@/types/taxonomy-analytics";

type TaxonomyTopReadsTableProps = {
  rows: TaxonomyAnalyticsTermSummary[];
  page: number;
  onPageChange: (next: number) => void;
};

export function TaxonomyTopReadsTable({
  rows,
  page,
  onPageChange
}: TaxonomyTopReadsTableProps) {
  return <TaxonomyTermTableBase onPageChange={onPageChange} page={page} rows={rows} />;
}
