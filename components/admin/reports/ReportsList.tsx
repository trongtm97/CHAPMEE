import { EmptyState } from "@/components/ui";
import { ReportCard } from "@/components/admin/reports/ReportCard";
import type { AdminReport } from "@/lib/admin/getReports";

type ReportsListProps = {
  reports: AdminReport[];
};

export function ReportsList({ reports }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <EmptyState
        description="Không có report nào trong trạng thái này."
        title="Hàng đợi báo cáo trống"
      />
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
    </div>
  );
}
