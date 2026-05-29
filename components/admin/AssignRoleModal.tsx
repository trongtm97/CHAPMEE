"use client";

import { useState, useTransition } from "react";
import { ModalShell } from "@/components/admin/username-policy/ModalShell";
import { Button, Textarea } from "@/components/ui";
import { assignUserRole } from "@/lib/admin/assign-role";
import { searchAdminUsers, type AdminUserSearchResult } from "@/lib/admin/get-users";
import { filterAssignableRoles, isElevatedRole } from "@/lib/admin/rbac-policy";
import { formatRoleLabel, isSensitiveRole } from "@/lib/admin/roles";
import type { AdminRoleRow } from "@/types/admin-roles";
import type { RoleCode } from "@/types/permissions";

type Props = {
  open: boolean;
  roles: AdminRoleRow[];
  actorRoles: RoleCode[];
  prefillRoleCode?: RoleCode;
  onClose: () => void;
  onSuccess: () => void;
};

export function AssignRoleModal({
  open,
  roles,
  actorRoles,
  prefillRoleCode,
  onClose,
  onSuccess
}: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [roleCode, setRoleCode] = useState<RoleCode>(prefillRoleCode ?? "reader");
  const [reason, setReason] = useState("");
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [confirmSensitive, setConfirmSensitive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const assignable = filterAssignableRoles(
    actorRoles,
    roles.map((r) => r.code)
  );
  const selectedRole = roles.find((r) => r.code === roleCode);
  const sensitive = selectedRole
    ? isSensitiveRole(selectedRole.code, selectedRole.permissions)
    : isElevatedRole(roleCode);

  function searchUsers() {
    startTransition(async () => {
      const res = await searchAdminUsers({ query, page: 1, pageSize: 10 });
      setSearchResults(res.users);
      if (res.error) setError(res.error);
    });
  }

  function submit() {
    if (!selectedUser) {
      setError("Vui lòng chọn user.");
      return;
    }
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do cấp quyền.");
      return;
    }
    if (sensitive && !confirmSensitive) {
      setError("Vui lòng xác nhận vai trò nhạy cảm.");
      return;
    }

    startTransition(async () => {
      const res = await assignUserRole({
        userId: selectedUser.id,
        roleCode,
        reason: reason.trim(),
        expiresAt: hasExpiry && expiresAt ? new Date(expiresAt).toISOString() : null
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Không thể gán vai trò.");
      }
    });
  }

  const selectClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <ModalShell onClose={onClose} title="Gán vai trò" wide>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Tìm user</label>
          <div className="flex gap-2">
            <input
              className={selectClass}
              placeholder="Username, email, tên hoặc user ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button disabled={isPending} onClick={searchUsers} type="button" variant="secondary">
              Tìm
            </Button>
          </div>
          {searchResults.length ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 p-2">
              {searchResults.map((user) => (
                <li key={user.id}>
                  <button
                    className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                      selectedUser?.id === user.id
                        ? "bg-cyan-900/40 text-white"
                        : "text-zinc-300 hover:bg-zinc-800"
                    }`}
                    onClick={() => setSelectedUser(user)}
                    type="button"
                  >
                    {user.display_name ?? user.username ?? user.id}
                    <span className="ml-2 text-xs text-zinc-500">@{user.username ?? "—"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedUser ? (
            <p className="mt-2 text-sm text-emerald-400">
              Đã chọn: {selectedUser.display_name ?? selectedUser.username}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Vai trò</label>
          <select
            className={selectClass}
            value={roleCode}
            onChange={(e) => setRoleCode(e.target.value as RoleCode)}
          >
            {assignable.map((code) => (
              <option key={code} value={code}>
                {formatRoleLabel(code)} ({code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Lý do cấp quyền *</label>
          <Textarea
            placeholder="Mô tả lý do cấp vai trò..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              checked={hasExpiry}
              onChange={(e) => setHasExpiry(e.target.checked)}
              type="checkbox"
            />
            Hết hạn vào ngày...
          </label>
          {hasExpiry ? (
            <input
              className={selectClass}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          ) : (
            <p className="text-xs text-zinc-500">Không hết hạn</p>
          )}
        </div>

        {sensitive ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3">
            <p className="text-sm text-amber-200">
              Quyền nhạy cảm — chỉ cấp cho người vận hành đáng tin cậy.
            </p>
            <label className="mt-2 flex items-start gap-2 text-sm text-zinc-300">
              <input
                checked={confirmSensitive}
                onChange={(e) => setConfirmSensitive(e.target.checked)}
                type="checkbox"
              />
              Tôi hiểu vai trò này có quyền nhạy cảm và thao tác sẽ được ghi audit log.
            </label>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button disabled={isPending} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button disabled={isPending} onClick={submit} type="button">
            Gán vai trò
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
