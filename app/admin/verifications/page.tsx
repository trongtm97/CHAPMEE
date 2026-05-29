import Link from "next/link";
import { AdminVerificationPage } from "@/components/admin/AdminVerificationPage";
import { ErrorState } from "@/components/ui";
import { getVerifications } from "@/lib/admin/get-verifications";
import { getVerificationSummary } from "@/lib/admin/get-verification-summary";
import { parseVerificationFilters } from "@/lib/admin/parse-verification-filters";
import { buildVerificationAdminCapabilities } from "@/lib/admin/verification-admin-capabilities";
import { requireAnyPermission } from "@/lib/auth/require-permission";
import type { RoleCode } from "@/types/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminVerificationsPage({ searchParams }: PageProps) {
  const guard = await requireAnyPermission(
    ["admin.user.update", "admin.user.view"],
    { returnTo: "/admin/verifications" }
  );

  if (!guard.ok) {
    return (
      <section className="space-y-6">
        <ErrorState message={guard.error} title="Không có quyền truy cập" />
      </section>
    );
  }

  const query = await searchParams;
  const filters = parseVerificationFilters(query);
  const capabilities = buildVerificationAdminCapabilities({
    permissions: guard.context.permissions,
    roles: guard.context.roles as RoleCode[]
  });

  let loadError = false;
  let items: Awaited<ReturnType<typeof getVerifications>>["items"] = [];
  let total = 0;
  let summary = await getVerificationSummary();

  try {
    const [listResult, summaryResult] = await Promise.all([
      getVerifications(filters),
      getVerificationSummary()
    ]);
    if (listResult.error) {
      loadError = true;
    } else {
      items = listResult.items;
      total = listResult.total;
    }
    summary = summaryResult;
  } catch {
    loadError = true;
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm text-cyan-300 hover:text-cyan-200" href="/admin">
          ← Admin
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-white">Xác thực tài khoản</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Duyệt yêu cầu xác thực, cấp tick xanh, quản lý tài khoản chính thức và lịch sử xác
          minh trên ChapMee.
        </p>
      </div>
      <AdminVerificationPage
        capabilities={capabilities}
        initialFilters={filters}
        initialItems={items}
        initialTotal={total}
        loadError={loadError}
        summary={summary}
      />
    </section>
  );
}
