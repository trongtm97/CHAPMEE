import { AdminFeedbackPage } from "@/components/admin/feedback/AdminFeedbackPage";
import { ErrorState } from "@/components/ui";
import { buildFeedbackAdminCapabilities } from "@/lib/admin/feedback/capabilities";
import { getFeedbackKpiSummary } from "@/lib/admin/feedback/get-kpis";
import { listAdminFeedback } from "@/lib/admin/get-feedback-list";
import { parseFeedbackDashboardFilters } from "@/lib/admin/parse-feedback-filters";
import { requirePermission } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFeedbackRoute({ searchParams }: PageProps) {
  const guard = await requirePermission("feedback.view.all", {
    returnTo: "/admin/feedback"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const query = await searchParams;
  const filters = parseFeedbackDashboardFilters(query);
  const capabilities = buildFeedbackAdminCapabilities(guard.context.permissions);

  const [listResult, summary] = await Promise.all([
    listAdminFeedback(filters),
    getFeedbackKpiSummary()
  ]);

  return (
    <section>
      <AdminFeedbackPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={listResult.items}
        initialTotal={listResult.total}
        loadError={Boolean(listResult.error)}
        summary={summary}
      />
    </section>
  );
}
