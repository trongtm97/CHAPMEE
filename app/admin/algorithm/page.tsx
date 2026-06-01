import { AdminAlgorithmControlCenterPage } from "@/components/admin/algorithm/AdminAlgorithmControlCenterPage";
import { ErrorState } from "@/components/ui";
import { loadAlgorithmSettingsPageData } from "@/lib/admin/algorithm-settings-data";
import { requireFinanceSettingsView } from "@/lib/auth/require-permission";
import { measureAsync } from "@/lib/dev/performance";
import type { AlgorithmControlTabId } from "@/types/algorithm-settings";
import { ALGORITHM_CONTROL_TABS } from "@/types/algorithm-settings";

export const dynamic = "force-dynamic";

const VALID_TABS = ALGORITHM_CONTROL_TABS.map((t) => t.id);

type PageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminAlgorithmPage({ searchParams }: PageProps) {
  const guard = await requireFinanceSettingsView("/admin/algorithm");

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" variant="danger" />;
  }

  const data = await measureAsync("admin.algorithm.load", loadAlgorithmSettingsPageData);
  const params = await searchParams;
  const tabParam = params.tab ?? "overview";
  const initialTab = VALID_TABS.includes(tabParam as AlgorithmControlTabId)
    ? (tabParam as AlgorithmControlTabId)
    : "overview";

  return (
    <AdminAlgorithmControlCenterPage initialData={data} initialTab={initialTab} />
  );
}
