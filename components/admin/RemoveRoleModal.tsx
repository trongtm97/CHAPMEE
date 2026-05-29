"use client";

import { useState, useTransition } from "react";
import { ModalShell } from "@/components/admin/username-policy/ModalShell";
import { Button, Textarea } from "@/components/ui";
import { removeUserRole } from "@/lib/admin/remove-role";
import { formatRoleLabel, isSensitiveRole } from "@/lib/admin/roles";
import type { AdminRoleRow, RoleUserRow } from "@/types/admin-roles";
import type { RoleCode } from "@/types/permissions";

type Props = {
  open: boolean;
  user: RoleUserRow | null;
  roles: AdminRoleRow[];
  onClose: () => void;
  onSuccess: () => void;
};

export function RemoveRoleModal({ open, user, roles, onClose, onSuccess }: Props) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open || !user) return null;

  const roleRow = roles.find((r) => r.code === user.role_code);
  const sensitive = roleRow
    ? isSensitiveRole(roleRow.code, roleRow.permissions)
    : user.role_code === "owner" || user.role_code === "super_admin";

  function submit() {
    if (!user) return;
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do gỡ vai trò.");
      return;
    }
    if (!confirmed) {
      setError("Vui lòng xác nhận thao tác.");
      return;
    }

    startTransition(async () => {
      const res = await removeUserRole({
        userId: user.user_id,
        roleCode: user.role_code as RoleCode,
        reason: reason.trim()
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(res.error ?? "Không thể gỡ vai trò.");
      }
    });
  }

  return (
    <ModalShell onClose={onClose} title="Gỡ vai trò">
      <div className="space-y-4">
        <p className="text-sm text-zinc-300">
          Gỡ vai trò{" "}
          <strong>{formatRoleLabel(user.role_code, user.role_name)}</strong> khỏi{" "}
          {user.display_name ?? user.username ?? user.user_id}?
        </p>

        {sensitive || user.role_code === "owner" ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-sm text-amber-200">
            Thao tác này có thể làm user mất quyền truy cập admin/studio/tài chính.
          </p>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Lý do gỡ *</label>
          <Textarea
            placeholder="Mô tả lý do gỡ vai trò..."
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-zinc-300">
          <input
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            type="checkbox"
          />
          Tôi xác nhận gỡ vai trò này và hiểu thao tác sẽ được ghi audit log.
        </label>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button disabled={isPending} onClick={onClose} type="button" variant="ghost">
            Huỷ
          </Button>
          <Button disabled={isPending} onClick={submit} type="button" variant="danger">
            Gỡ vai trò
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
