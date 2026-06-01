import { AlgorithmItemAuditPanel } from "@/components/admin/algorithm/AlgorithmItemAuditPanel";
import { ErrorState } from "@/components/ui";
import { loadAuthorAlgorithmAudit } from "@/lib/explainability/load-item-audit";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminAuthorAlgorithmAuditPage({ params }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/algorithm/audit");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const data = await loadAuthorAlgorithmAudit(supabase, id);

  return <AlgorithmItemAuditPanel data={data} />;
}
