import { AlgorithmItemAuditPanel } from "@/components/admin/algorithm/AlgorithmItemAuditPanel";
import { ErrorState } from "@/components/ui";
import { loadAuthorAlgorithmAudit } from "@/lib/explainability/load-item-audit";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { createAdminClient } from "@/lib/data/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserAlgorithmPage({ params }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/users");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const db = createAdminClient();
  const data = await loadAuthorAlgorithmAudit(db, id);

  return (
    <AlgorithmItemAuditPanel
      backHref={`/admin/users`}
      data={data}
    />
  );
}
