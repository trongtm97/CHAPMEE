"use client";

import { useState, useTransition } from "react";
import { ModalShell } from "@/components/admin/username-policy/ModalShell";
import { Button } from "@/components/ui";
import { checkUserPermissionAction } from "@/lib/admin/check-user-permission";
import { searchAdminUsers, type AdminUserSearchResult } from "@/lib/admin/get-users";
import type { PermissionCheckResult } from "@/types/admin-roles";
import type { PermissionCode } from "@/types/permissions";

const COMMON_PERMISSIONS: PermissionCode[] = [
  "admin.user.role.assign",
  "admin.user.ban",
  "admin.settings.update",
  "finance.payout.approve",
  "finance.wallet.adjust",
  "moderation.ban_user",
  "story.approve",
  "chapter.set_vip",
  "notification.send.system",
  "admin.dashboard.view",
  "creator.dashboard.view.own",
  "comment.create"
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function UserPermissionCheckModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AdminUserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchResult | null>(null);
  const [permissionCode, setPermissionCode] = useState<PermissionCode>(
    "admin.user.role.assign"
  );
  const [result, setResult] = useState<PermissionCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function searchUsers() {
    startTransition(async () => {
      const res = await searchAdminUsers({ query, page: 1, pageSize: 10 });
      setSearchResults(res.users);
    });
  }

  function check() {
    if (!selectedUser) {
      setError("Vui lòng chọn user.");
      return;
    }
    startTransition(async () => {
      const res = await checkUserPermissionAction({
        userId: selectedUser.id,
        permissionCode
      });
      if (res.ok && res.result) {
        setResult(res.result);
        setError(null);
      } else {
        setError(res.error ?? "Không kiểm tra được quyền.");
      }
    });
  }

  const selectClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200";

  return (
    <ModalShell onClose={onClose} title="Kiểm tra quyền user" wide>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-zinc-400">Tìm user</label>
          <div className="flex gap-2">
            <input
              className={selectClass}
              placeholder="Username, tên hoặc user ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button disabled={isPending} onClick={searchUsers} type="button" variant="secondary">
              Tìm
            </Button>
          </div>
          {searchResults.length ? (
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-zinc-800 p-2">
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
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-400">Permission cần kiểm tra</label>
          <select
            className={selectClass}
            value={permissionCode}
            onChange={(e) => setPermissionCode(e.target.value as PermissionCode)}
          >
            {COMMON_PERMISSIONS.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button disabled={isPending} onClick={check} type="button">
          Kiểm tra
        </Button>

        {result ? (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
            <p className={result.hasPermission ? "text-emerald-400" : "text-red-400"}>
              {result.hasPermission ? "Có quyền" : "Không có quyền"}: {result.permissionCode}
            </p>
            {result.sourceRoles.length ? (
              <div className="mt-2">
                <p className="text-zinc-400">Quyền đến từ role:</p>
                <ul className="mt-1 list-disc pl-5 text-zinc-300">
                  {result.sourceRoles.map((r) => (
                    <li key={r.code}>
                      {r.label} ({r.code}) — {r.active ? "active" : "hết hạn"}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.isBannedOverride ? (
              <p className="mt-2 text-amber-300">User bị banned override.</p>
            ) : null}
            {result.isRestrictedOverride ? (
              <p className="mt-1 text-amber-300">
                User có role hạn chế (banned_user) — có thể override quyền ghi.
              </p>
            ) : null}
            {result.suggestion ? (
              <p className="mt-2 text-zinc-400">{result.suggestion}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}
