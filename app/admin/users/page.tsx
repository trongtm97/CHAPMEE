import { AdminUsersPage } from "@/components/admin/AdminUsersPage";
import { ErrorState } from "@/components/ui";
import { getUserOperationsSummary } from "@/lib/admin/get-user-operations-summary";
import { listAdminUsers } from "@/lib/admin/get-users";
import { loadAdminUserDetailAction } from "@/lib/admin/load-admin-user-detail";
import { parseUserDashboardFilters } from "@/lib/admin/parse-user-dashboard-filters";
import { buildUserAdminCapabilities } from "@/lib/admin/user-admin-capabilities";
import { requirePermission } from "@/lib/auth/require-permission";
import type { RoleCode } from "@/types/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersRoute({ searchParams }: PageProps) {
  const guard = await requirePermission("admin.user.view", {
    returnTo: "/admin/users"
  });

  if (!guard.ok) {
    return <ErrorState message={guard.error} title="Không có quyền truy cập" />;
  }

  const query = await searchParams;
  const filters = parseUserDashboardFilters(query);
  const capabilities = buildUserAdminCapabilities({
    permissions: guard.context.permissions,
    roles: guard.context.roles as RoleCode[]
  });

  let loadError = false;
  let users: Awaited<ReturnType<typeof listAdminUsers>>["users"] = [];
  let total = 0;
  let summary: Awaited<ReturnType<typeof getUserOperationsSummary>> = {
    totalUsers: 0,
    newUsers24h: 0,
    active7d: 0,
    creators: 0,
    restrictedUsers: 0,
    bannedUsers: 0,
    pendingVerification: 0,
    usersWithStrikes: 0
  };

  try {
    const [listResult, summaryResult] = await Promise.all([
      listAdminUsers(filters),
      getUserOperationsSummary()
    ]);
    if (listResult.error) {
      loadError = true;
    } else {
      users = listResult.users;
      total = listResult.total;
    }
    summary = summaryResult;
  } catch {
    loadError = true;
  }

  if (filters.selectedUserId && !loadError) {
    const detailResult = await loadAdminUserDetailAction(filters.selectedUserId);
    if (!detailResult.detail) {
      filters.selectedUserId = undefined;
    }
  }

  return (
    <AdminUsersPage
      capabilities={capabilities}
      initialFilters={filters}
      initialTotal={total}
      initialUsers={users}
      loadError={loadError}
      moderatorId={guard.context.userId}
      summary={summary}
    />
  );
}
