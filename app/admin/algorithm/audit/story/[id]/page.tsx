import { AlgorithmItemAuditPanel } from "@/components/admin/algorithm/AlgorithmItemAuditPanel";
import { ErrorState } from "@/components/ui";
import { loadStoryAlgorithmAudit } from "@/lib/explainability/load-item-audit";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { createAdminClient } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminStoryAlgorithmAuditPage({ params }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/algorithm/audit");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const db = createAdminClient();
  const data = await loadStoryAlgorithmAudit(db, id);

  return <AlgorithmItemAuditPanel data={data} />;
}
