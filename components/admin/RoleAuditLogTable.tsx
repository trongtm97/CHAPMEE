"use client";

import { useState, useTransition } from "react";
import { Button, EmptyState } from "@/components/ui";
import { getRoleAuditLogsAction } from "@/lib/admin/get-role-center-data";

type AuditRow = {
  id: string;
  action: string;
  actor_label: string | null;
  target_user_label: string | null;
  role_key: string | null;
  permission_key: string | null;
  reason: string | null;
  created_at: string;
};

type Props = {
  initialLogs: AuditRow[];
  roleCode?: string;
};

export function RoleAuditLogTable({ initialLogs, roleCode }: Props) {
  const [logs, setLogs] = useState(initialLogs);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(initialLogs.length);
  const [isPending, startTransition] = useTransition();

  function load(nextPage: number, nextPageSize = pageSize) {
    startTransition(async () => {
      const res = await getRoleAuditLogsAction({
        page: nextPage,
        pageSize: nextPageSize,
        roleCode
      });
      setLogs(res.logs);
      setTotal(res.total);
      setPage(nextPage);
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!logs.length && !isPending) {
    return (
      <EmptyState
        description="Khi có thao tác gán/gỡ vai trò, lịch sử sẽ xuất hiện tại đây."
        title="Chưa có thay đổi phân quyền"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          value={pageSize}
          onChange={(e) => {
            const nextSize = Number(e.target.value);
            setPageSize(nextSize);
            load(1, nextSize);
          }}
        >
          <option value={25}>25/trang</option>
          <option value={50}>50/trang</option>
          <option value={100}>100/trang</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900/80 text-left text-zinc-400">
            <tr>
              <th className="px-3 py-2">Thời gian</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Quyền</th>
              <th className="px-3 py-2">Lý do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                  {new Date(log.created_at).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-zinc-300">{log.actor_label ?? "—"}</td>
                <td className="px-3 py-2 font-medium text-white">{log.action}</td>
                <td className="px-3 py-2 text-zinc-400">{log.target_user_label ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-400">{log.role_key ?? "—"}</td>
                <td className="px-3 py-2 text-zinc-400">{log.permission_key ?? "—"}</td>
                <td className="max-w-xs px-3 py-2 text-zinc-500">{log.reason ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>
          {total} bản ghi · trang {page}/{totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            disabled={isPending || page <= 1}
            onClick={() => load(page - 1)}
            type="button"
            variant="secondary"
          >
            Trước
          </Button>
          <Button
            disabled={isPending || page >= totalPages}
            onClick={() => load(page + 1)}
            type="button"
            variant="secondary"
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
