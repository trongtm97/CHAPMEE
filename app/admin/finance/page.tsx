import { AdminFinanceDashboard } from "@/components/admin/finance/AdminFinanceDashboard";
import { ErrorState, SectionHeader } from "@/components/ui";
import { logFinanceAudit } from "@/lib/admin/finance-audit";
import { getFinanceCapabilities } from "@/lib/admin/finance-capabilities";
import { requireFinanceAccess } from "@/lib/auth/require-permission";
import { buildFinanceDashboardData } from "@/lib/finance/finance-metrics";
import type { FinanceTimeFilter } from "@/types/finance";

export const dynamic = "force-dynamic";

function parseRange(input: string | string[] | undefined): FinanceTimeFilter {
  const value = Array.isArray(input) ? input[0] : input;
  if (
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "month" ||
    value === "all" ||
    value === "custom"
  ) {
    return value;
  }
  return "7d";
}

function parseDateParam(input: string | string[] | undefined) {
  const value = Array.isArray(input) ? input[0] : input;
  return value ?? null;
}

type FinancePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFinancePage({ searchParams }: FinancePageProps) {
  const guard = await requireFinanceAccess("/admin/finance");
  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <SectionHeader title="Không có quyền truy cập" subtitle="Chỉ dành cho quản trị viên hoặc founder." />
        <ErrorState message={guard.error} title="Không có quyền truy cập admin" variant="danger" />
      </section>
    );
  }

  const params = await searchParams;
  const range = parseRange(params.range);
  const customFrom = parseDateParam(params.from);
  const customTo = parseDateParam(params.to);

  const capabilities = getFinanceCapabilities(guard.context);

  await logFinanceAudit("finance_dashboard_view", {
    range,
    from: customFrom,
    to: customTo
  });

  const finance = await buildFinanceDashboardData(range, {
    from: customFrom,
    to: customTo
  });

  return (
    <section className="space-y-6">
      {finance.error || !finance.data ? (
        <ErrorState
          message={finance.error ?? "Không tải được bảng điều khiển tài chính."}
          title="Lỗi dữ liệu tài chính"
        />
      ) : (
        <AdminFinanceDashboard capabilities={capabilities} data={finance.data} />
      )}
    </section>
  );
}
