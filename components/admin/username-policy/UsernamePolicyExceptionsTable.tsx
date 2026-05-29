"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { scopeLabel, ruleTypeLabel } from "@/lib/admin/username-policy-labels";
import { revokeUsernamePolicyExceptionAction } from "@/lib/admin/username-policy-exceptions";
import { paginate } from "@/lib/admin/username-policy-helpers";
import type {
  UsernamePolicyAdminCapabilities,
  UsernamePolicyExceptionRow
} from "@/types/username-policy";

const PAGE_SIZE = 25;

export function UsernamePolicyExceptionsTable({
  exceptions,
  page,
  onPage,
  capabilities,
  onRefresh
}: {
  exceptions: UsernamePolicyExceptionRow[];
  page: number;
  onPage: (p: number) => void;
  capabilities: UsernamePolicyAdminCapabilities;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const paged = paginate(exceptions, page, PAGE_SIZE);

  if (exceptions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="font-semibold text-white">Chưa có ngoại lệ</p>
        <p className="mt-2 text-sm text-zinc-400">
          Thêm ngoại lệ khi cần cho phép user dùng username hoặc từ khóa đặc biệt.
        </p>
      </div>
    );
  }

  function revoke(exceptionId: string) {
    startTransition(async () => {
      await revokeUsernamePolicyExceptionAction({ exceptionId });
      onRefresh();
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Rule</th>
            <th className="px-3 py-2">Phạm vi</th>
            <th className="px-3 py-2">Hết hạn</th>
            <th className="px-3 py-2">Lý do</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((ex) => (
            <tr className="border-b border-white/5 text-zinc-300" key={ex.id}>
              <td className="px-3 py-2">
                <Link className="text-cyan-300 hover:underline" href={`/admin/users/${ex.user_id}`}>
                  {ex.user?.display_name ?? ex.user?.username ?? ex.user_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-3 py-2">
                {ex.rule?.value ?? "—"}{" "}
                <span className="text-zinc-500">
                  {ex.rule?.rule_type ? ruleTypeLabel(ex.rule.rule_type) : ""}
                </span>
              </td>
              <td className="px-3 py-2">{scopeLabel(ex.exception_scope)}</td>
              <td className="px-3 py-2 text-xs">
                {ex.expires_at
                  ? new Date(ex.expires_at).toLocaleDateString("vi-VN")
                  : "Không hết hạn"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {capabilities.canViewSensitiveNotes ? (ex.reason ?? "—") : "—"}
              </td>
              <td className="px-3 py-2">
                {capabilities.canManageExceptions ? (
                  <button
                    className="text-xs text-red-300 hover:underline"
                    disabled={isPending}
                    onClick={() => revoke(ex.id)}
                    type="button"
                  >
                    Thu hồi
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {paged.totalPages > 1 ? (
        <div className="flex items-center justify-between px-3 py-2 text-sm text-zinc-400">
          <span>
            Trang {paged.page}/{paged.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={paged.page <= 1}
              onClick={() => onPage(paged.page - 1)}
              type="button"
              variant="ghost"
            >
              Trước
            </Button>
            <Button
              disabled={paged.page >= paged.totalPages}
              onClick={() => onPage(paged.page + 1)}
              type="button"
              variant="ghost"
            >
              Sau
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
