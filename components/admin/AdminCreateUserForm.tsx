"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { createAdminUserAction } from "@/lib/admin/create-admin-user";
import { formatAdminRoleLabel } from "@/lib/admin/role-labels";
import { filterAssignableRoles } from "@/lib/admin/rbac-policy";
import type { RoleCode } from "@/types/permissions";

const BASE_ROLES: RoleCode[] = [
  "reader",
  "creator",
  "verified_creator",
  "moderator",
  "content_admin",
  "finance_admin",
  "support_admin",
  "admin",
  "super_admin",
  "owner"
];

type AdminCreateUserFormProps = {
  canAssignRoles: boolean;
  actorRoles: RoleCode[];
  onCreated: (userId: string) => void;
};

export function AdminCreateUserForm({
  canAssignRoles,
  actorRoles,
  onCreated
}: AdminCreateUserFormProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [initialRole, setInitialRole] = useState<RoleCode>("reader");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const assignableRoles = canAssignRoles
    ? filterAssignableRoles(actorRoles, BASE_ROLES)
    : (["reader"] as RoleCode[]);

  function submit() {
    startTransition(async () => {
      setMessage(null);
      const result = await createAdminUserAction({
        email,
        password,
        displayName,
        username: username.trim() || null,
        initialRole: canAssignRoles ? initialRole : "reader"
      });

      if (!result.ok) {
        setMessage(result.error ?? "Không thể tạo tài khoản.");
        return;
      }

      setMessage(
        `Đã tạo tài khoản ${result.user?.email} (${formatAdminRoleLabel(result.user?.initialRole ?? "reader")}).`
      );
      setEmail("");
      setPassword("");
      setDisplayName("");
      setUsername("");
      setInitialRole("reader");
      if (result.user?.id) {
        onCreated(result.user.id);
      }
    });
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} type="button" variant="secondary">
        + Tạo tài khoản mới
      </Button>
    );
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Tạo tài khoản mới</h2>
        <Button onClick={() => setOpen(false)} type="button" variant="ghost">
          Đóng
        </Button>
      </div>
      <p className="text-sm text-zinc-400">
        Tạo user trên Supabase Auth, profile và vai trò khởi tạo. Yêu cầu quyền{" "}
        <code className="text-zinc-300">admin.user.update</code>
        {canAssignRoles ? " và gán role nâng cao cần admin.user.role.assign" : ""}.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Email *</span>
          <input
            autoComplete="off"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Mật khẩu tạm *</span>
          <input
            autoComplete="new-password"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            value={password}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Username (tuỳ chọn)</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Tự sinh từ email nếu trống"
            value={username}
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-xs text-zinc-400">Tên hiển thị *</span>
          <input
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
            onChange={(e) => setDisplayName(e.target.value)}
            value={displayName}
          />
        </label>
        {canAssignRoles ? (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-xs text-zinc-400">Vai trò khởi tạo</span>
            <select
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setInitialRole(e.target.value as RoleCode)}
              value={initialRole}
            >
              {assignableRoles.map((code) => (
                <option key={code} value={code}>
                  {formatAdminRoleLabel(code)} ({code})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {message ? <p className="text-sm text-amber-300">{message}</p> : null}

      <Button disabled={isPending} onClick={submit} type="button">
        {isPending ? "Đang tạo…" : "Tạo tài khoản"}
      </Button>
    </Card>
  );
}
