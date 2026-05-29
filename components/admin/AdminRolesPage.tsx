"use client";

import { useMemo, useState, useTransition } from "react";
import { AssignRoleModal } from "@/components/admin/AssignRoleModal";
import { RemoveRoleModal } from "@/components/admin/RemoveRoleModal";
import { RoleAuditLogTable } from "@/components/admin/RoleAuditLogTable";
import { filterAndSortRoles, RoleCards } from "@/components/admin/RoleCards";
import { RoleDetailDrawer } from "@/components/admin/RoleDetailDrawer";
import { RoleFilters } from "@/components/admin/RoleFilters";
import { RolePermissionMatrix } from "@/components/admin/RolePermissionMatrix";
import { RoleSummaryCards } from "@/components/admin/RoleSummaryCards";
import { RoleUsersTable } from "@/components/admin/RoleUsersTable";
import { UserPermissionCheckModal } from "@/components/admin/UserPermissionCheckModal";
import { Button, Card, EmptyState, ErrorState } from "@/components/ui";
import {
  logRoleCenterViewAction,
  refreshRoleCenterDataAction
} from "@/lib/admin/get-role-center-data";
import {
  formatRoleLabel,
  getRoleGroup,
  isSensitivePermission,
  ROLE_GROUP_LABELS_VI,
  roleHasSensitivePermissions
} from "@/lib/admin/roles";
import type {
  AdminRoleRow,
  RoleAdminTab,
  RoleCenterInitialData,
  RoleCenterSummary,
  RoleGroupKey,
  RoleSortKey,
  RoleUserRow
} from "@/types/admin-roles";
import type { RoleCode } from "@/types/permissions";

const TABS: { id: RoleAdminTab; label: string }[] = [
  { id: "overview", label: "Tổng quan" },
  { id: "roles", label: "Vai trò" },
  { id: "matrix", label: "Ma trận quyền" },
  { id: "users", label: "Người dùng theo vai trò" },
  { id: "sensitive", label: "Quyền nhạy cảm" },
  { id: "audit", label: "Audit log" }
];

type Props = RoleCenterInitialData;

export function AdminRolesPage({
  roles: initialRoles,
  summary: initialSummary,
  capabilities,
  auditLogs: initialAuditLogs,
  error: initialError
}: Props) {
  const [roles, setRoles] = useState(initialRoles);
  const [summary, setSummary] = useState(initialSummary);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [error, setError] = useState(initialError);
  const [activeTab, setActiveTab] = useState<RoleAdminTab>("overview");
  const [query, setQuery] = useState("");
  const [roleGroup, setRoleGroup] = useState<RoleGroupKey | "all">("all");
  const [roleType, setRoleType] = useState<"all" | "system" | "custom">("all");
  const [sensitiveOnly, setSensitiveOnly] = useState(false);
  const [hasUsers, setHasUsers] = useState<"all" | "yes" | "no">("all");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const [sort, setSort] = useState<RoleSortKey>("name_asc");
  const [matrixView, setMatrixView] = useState<"group" | "detail">("group");
  const [matrixSensitive, setMatrixSensitive] = useState(false);
  const [matrixAdmin, setMatrixAdmin] = useState(false);
  const [matrixCreatorReader, setMatrixCreatorReader] = useState(false);
  const [matrixFinance, setMatrixFinance] = useState(false);
  const [drawerRole, setDrawerRole] = useState<AdminRoleRow | null>(null);
  const [usersRoleCode, setUsersRoleCode] = useState<RoleCode | undefined>();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPrefill, setAssignPrefill] = useState<RoleCode | undefined>();
  const [removeUser, setRemoveUser] = useState<RoleUserRow | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [, startTransition] = useTransition();

  const filteredRoles = useMemo(
    () =>
      filterAndSortRoles(roles, {
        query,
        roleGroup,
        roleType,
        sensitiveOnly,
        hasUsers,
        status,
        sort
      }),
    [roles, query, roleGroup, roleType, sensitiveOnly, hasUsers, status, sort]
  );

  function refresh() {
    startTransition(async () => {
      const data = await refreshRoleCenterDataAction();
      setRoles(data.roles);
      setSummary(data.summary);
      setAuditLogs(data.auditLogs);
      setError(data.error);
    });
  }

  function openMatrixTab() {
    setActiveTab("matrix");
    startTransition(async () => {
      await logRoleCenterViewAction({ action: "role_matrix_viewed" });
    });
  }

  function openAssign(prefill?: RoleCode) {
    setAssignPrefill(prefill);
    setAssignOpen(true);
  }

  if (error && !roles.length) {
    return (
      <ErrorState
        action={
          <Button onClick={refresh} type="button">
            Thử lại
          </Button>
        }
        message="Vui lòng thử lại hoặc kiểm tra cấu hình RBAC."
        title="Không tải được dữ liệu phân quyền"
      />
    );
  }

  return (
    <section className="space-y-6">
      <RoleSummaryCards onSelectTab={setActiveTab} summary={summary} />

      <div className="flex flex-wrap gap-2">
        {capabilities.canAssignRoles ? (
          <Button onClick={() => openAssign()} type="button">
            Gán vai trò
          </Button>
        ) : null}
        <Button onClick={() => setCheckOpen(true)} type="button" variant="secondary">
          Kiểm tra quyền user
        </Button>
        <Button onClick={openMatrixTab} type="button" variant="ghost">
          Xem ma trận quyền
        </Button>
        <Button onClick={() => setActiveTab("audit")} type="button" variant="ghost">
          Audit log
        </Button>
        <Button disabled title="Sau MVP" type="button" variant="ghost">
          Tạo role tuỳ chỉnh — sau MVP
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-white/10 pb-1">
        {TABS.map((tab) => (
          <button
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-cyan-300 text-zinc-950"
                : "text-zinc-400 hover:text-white"
            }`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <OverviewTab roles={roles} summary={summary} />
      ) : null}

      {activeTab === "roles" || activeTab === "sensitive" ? (
        <div className="space-y-4">
          <RoleFilters
            hasUsers={hasUsers}
            onHasUsersChange={setHasUsers}
            onQueryChange={setQuery}
            onRoleGroupChange={setRoleGroup}
            onRoleTypeChange={setRoleType}
            onSensitiveOnlyChange={setSensitiveOnly}
            onSortChange={setSort}
            onStatusChange={setStatus}
            query={query}
            roleGroup={roleGroup}
            roleType={roleType}
            sensitiveOnly={activeTab === "sensitive" ? true : sensitiveOnly}
            sort={sort}
            status={status}
          />
          <RoleCards
            canAssignRoles={capabilities.canAssignRoles}
            onAssignRole={(role) => openAssign(role.code)}
            onViewAudit={(role) => {
              setDrawerRole(role);
            }}
            onViewDetail={setDrawerRole}
            onViewUsers={(role) => {
              setUsersRoleCode(role.code);
              setActiveTab("users");
            }}
            roles={
              activeTab === "sensitive"
                ? filteredRoles.filter((r) => roleHasSensitivePermissions(r.permissions))
                : filteredRoles
            }
          />
        </div>
      ) : null}

      {activeTab === "matrix" ? (
        <RolePermissionMatrix
          filterAdminRoles={matrixAdmin}
          filterCreatorReader={matrixCreatorReader}
          filterFinance={matrixFinance}
          filterSensitive={matrixSensitive}
          onFilterAdminRolesChange={setMatrixAdmin}
          onFilterCreatorReaderChange={setMatrixCreatorReader}
          onFilterFinanceChange={setMatrixFinance}
          onFilterSensitiveChange={setMatrixSensitive}
          onViewModeChange={setMatrixView}
          roles={roles}
          viewMode={matrixView}
        />
      ) : null}

      {activeTab === "users" ? (
        <RoleUsersTable
          key={usersRoleCode ?? "all-users"}
          canAssignRoles={capabilities.canAssignRoles}
          initialRoleCode={usersRoleCode}
          onAssignRole={(prefill) => openAssign(prefill?.roleCode)}
          onRemoveRole={setRemoveUser}
        />
      ) : null}

      {activeTab === "audit" ? (
        capabilities.canViewAudit ? (
          <RoleAuditLogTable
            initialLogs={auditLogs}
            key={auditLogs.map((l) => l.id).join("-") || "empty-audit"}
          />
        ) : (
          <EmptyState
            description="Cần quyền admin.audit.view để xem lịch sử."
            title="Không có quyền xem audit log"
          />
        )
      ) : null}

      <RoleDetailDrawer
        auditLogs={auditLogs}
        onAssignRole={(role) => openAssign(role.code)}
        onClose={() => setDrawerRole(null)}
        onViewUsers={(role) => {
          setDrawerRole(null);
          setUsersRoleCode(role.code);
          setActiveTab("users");
        }}
        open={Boolean(drawerRole)}
        role={drawerRole}
      />

      <AssignRoleModal
        actorRoles={capabilities.actorRoles}
        onClose={() => setAssignOpen(false)}
        onSuccess={refresh}
        open={assignOpen}
        prefillRoleCode={assignPrefill}
        roles={roles}
      />

      <RemoveRoleModal
        onClose={() => setRemoveUser(null)}
        onSuccess={refresh}
        open={Boolean(removeUser)}
        roles={roles}
        user={removeUser}
      />

      <UserPermissionCheckModal onClose={() => setCheckOpen(false)} open={checkOpen} />
    </section>
  );
}

function OverviewTab({
  roles,
  summary
}: {
  roles: AdminRoleRow[];
  summary: RoleCenterSummary;
}) {
  const groupCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const role of roles) {
      const g = ROLE_GROUP_LABELS_VI[getRoleGroup(role.code)];
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [roles]);

  const topSensitive = roles
    .filter((r) => roleHasSensitivePermissions(r.permissions))
    .slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold text-white">Tổng quan hệ thống phân quyền</h3>
        <p className="text-sm text-zinc-400">
          ChapMee dùng RBAC với {summary.totalRoles} vai trò hệ thống, gán qua{" "}
          <code className="text-zinc-300">user_roles</code> và kiểm tra permission runtime.
        </p>
        <ul className="space-y-1 text-sm text-zinc-400">
          {groupCounts.map(([group, count]) => (
            <li key={group}>
              {group}: <strong className="text-zinc-200">{count}</strong> vai trò
            </li>
          ))}
        </ul>
      </Card>
      <Card className="space-y-3 p-4">
        <h3 className="font-semibold text-white">Vai trò có quyền nhạy cảm</h3>
        {topSensitive.length ? (
          <ul className="space-y-2 text-sm">
            {topSensitive.map((role) => (
              <li className="flex justify-between text-zinc-400" key={role.code}>
                <span>{formatRoleLabel(role.code)}</span>
                <span className="text-zinc-500">
                  {role.permissions.filter((p) => isSensitivePermission(p.code)).length} quyền
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Không có.</p>
        )}
        <p className="text-xs text-amber-300">
          Quyền nhạy cảm — chỉ cấp cho người vận hành đáng tin cậy.
        </p>
      </Card>
      <Card className="space-y-2 p-4 lg:col-span-2">
        <h3 className="font-semibold text-white">Thống kê nhanh</h3>
        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400 sm:grid-cols-4">
          <span>Tài chính: {summary.financeRoles} role</span>
          <span>Kiểm duyệt: {summary.moderationRoles} role</span>
          <span>Quản trị user: {summary.userAdminRoles} role</span>
          <span>Thay đổi 7 ngày: {summary.changes7d}</span>
        </div>
      </Card>
    </div>
  );
}
