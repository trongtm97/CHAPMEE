import { AdminAlgorithmControlCenterPage } from "@/components/admin/algorithm/AdminAlgorithmControlCenterPage";
import { ErrorState } from "@/components/ui";
import { loadAlgorithmSettingsPageData } from "@/lib/admin/algorithm-settings-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";

export const dynamic = "force-dynamic";

export default async function AdminAlgorithmAuditPage() {
  const guard = await requireFinanceSettingsView("/admin/algorithm/audit");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const data = await loadAlgorithmSettingsPageData();

  return (
    <AdminAlgorithmControlCenterPage
      basePath="/admin/algorithm/audit"
      initialData={data}
      initialTab="audit"
    />
  );
}
