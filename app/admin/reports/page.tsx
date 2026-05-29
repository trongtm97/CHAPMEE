import { AdminReportsPage } from "@/components/admin/AdminReportsPage";
import { ErrorState } from "@/components/ui";
import { getReportPageData } from "@/lib/admin/get-report-page-data";
import { requireAdminOrModerator } from "@/lib/auth/requireAdminOrModerator";

export const dynamic = "force-dynamic";

export default async function AdminReportsRoutePage() {
  const guard = await requireAdminOrModerator("/admin/reports");

  if (!guard.ok) {
    return (
      <section className="mx-auto max-w-[1320px] space-y-6">
        <h1 className="text-3xl font-bold tracking-normal text-white">
          Không có quyền truy cập
        </h1>
        <ErrorState
          message={guard.error}
          title="Không có quyền truy cập admin"
          variant="danger"
        />
      </section>
    );
  }

  const data = await getReportPageData();

  return <AdminReportsPage data={data} />;
}
