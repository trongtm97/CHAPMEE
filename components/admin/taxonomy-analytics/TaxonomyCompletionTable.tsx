import { TaxonomyTermTableBase } from "@/components/admin/taxonomy-analytics/TaxonomyTermTableBase";
import type { TaxonomyAnalyticsTermSummary } from "@/types/taxonomy-analytics";

type TaxonomyCompletionTableProps = {
  rows: TaxonomyAnalyticsTermSummary[];
  page: number;
  onPageChange: (next: number) => void;
};

export function TaxonomyCompletionTable({
  rows,
  page,
  onPageChange
}: TaxonomyCompletionTableProps) {
  return <TaxonomyTermTableBase onPageChange={onPageChange} page={page} rows={rows} />;
}
