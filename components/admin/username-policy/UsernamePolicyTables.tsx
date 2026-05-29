"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import {
  enforcementLabel,
  matchTypeLabel,
  ruleTypeLabel,
  scopeLabel
} from "@/lib/admin/username-policy-labels";
import { paginate } from "@/lib/admin/username-policy-helpers";
import type {
  UsernamePolicyAdminCapabilities,
  UsernamePolicyAuditLogRow,
  UsernamePolicyConflictItem,
  UsernamePolicyRuleRow,
  UsernameChangeHistoryRow
} from "@/types/username-policy";

const PAGE_SIZE = 25;

function Pagination({
  page,
  totalPages,
  onPage
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-3 text-sm text-zinc-400">
      <span>
        Trang {page}/{totalPages}
      </span>
      <div className="flex gap-2">
        <Button disabled={page <= 1} onClick={() => onPage(page - 1)} type="button" variant="ghost">
          Trước
        </Button>
        <Button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          type="button"
          variant="ghost"
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

export function UsernamePolicyRulesTable({
  rules,
  page,
  onPage,
  onSelectRule,
  onEditRule,
  onToggle,
  onAddException,
  capabilities,
  isPending
}: {
  rules: UsernamePolicyRuleRow[];
  page: number;
  onPage: (p: number) => void;
  onSelectRule: (rule: UsernamePolicyRuleRow) => void;
  onEditRule?: (rule: UsernamePolicyRuleRow) => void;
  onToggle: (rule: UsernamePolicyRuleRow) => void;
  onAddException: (rule: UsernamePolicyRuleRow) => void;
  capabilities: UsernamePolicyAdminCapabilities;
  isPending: boolean;
}) {
  const paged = paginate(rules, page, PAGE_SIZE);

  if (rules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="font-semibold text-white">Chưa có rule nào</p>
        <p className="mt-2 text-sm text-zinc-400">
          Tạo rule đầu tiên để bảo vệ username, thương hiệu và tài khoản chính thức trên ChapMee.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">Giá trị</th>
            <th className="px-3 py-2">Loại</th>
            <th className="px-3 py-2">Kiểu khớp</th>
            <th className="px-3 py-2">Phạm vi</th>
            <th className="px-3 py-2">Mức xử lý</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Ngoại lệ</th>
            <th className="px-3 py-2">Cập nhật</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((rule) => (
            <tr className="border-b border-white/5 text-zinc-300" key={rule.id}>
              <td className="px-3 py-2 font-medium text-white">{rule.value}</td>
              <td className="px-3 py-2">{ruleTypeLabel(rule.rule_type)}</td>
              <td className="px-3 py-2">{matchTypeLabel(rule.match_type)}</td>
              <td className="px-3 py-2">{scopeLabel(rule.scope)}</td>
              <td className="px-3 py-2">{enforcementLabel(rule.enforcement_level)}</td>
              <td className="px-3 py-2">{rule.is_active ? "Bật" : "Tắt"}</td>
              <td className="px-3 py-2">{rule.allowed_user_ids?.length ?? 0}</td>
              <td className="px-3 py-2 text-xs">
                {new Date(rule.updated_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  <button
                    className="text-xs text-cyan-300 hover:underline"
                    onClick={() => onSelectRule(rule)}
                    type="button"
                  >
                    Xem
                  </button>
                  {capabilities.canManageRules && onEditRule ? (
                    <button
                      className="text-xs text-zinc-400 hover:text-white"
                      onClick={() => onEditRule(rule)}
                      type="button"
                    >
                      Sửa
                    </button>
                  ) : null}
                  {capabilities.canManageRules ? (
                    <button
                      className="text-xs text-zinc-400 hover:text-white"
                      disabled={isPending}
                      onClick={() => onToggle(rule)}
                      type="button"
                    >
                      {rule.is_active ? "Tắt" : "Bật"}
                    </button>
                  ) : null}
                  {capabilities.canManageExceptions ? (
                    <button
                      className="text-xs text-zinc-400 hover:text-white"
                      onClick={() => onAddException(rule)}
                      type="button"
                    >
                      Ngoại lệ
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3">
        <Pagination onPage={onPage} page={paged.page} totalPages={paged.totalPages} />
      </div>
    </div>
  );
}

export function UsernamePolicyConflictsTable({
  conflicts,
  page,
  onPage,
  onAddException,
  onManualAssign,
  onLockUsername,
  capabilities
}: {
  conflicts: UsernamePolicyConflictItem[];
  page: number;
  onPage: (p: number) => void;
  onAddException: (ruleId: string, userId: string) => void;
  onManualAssign: (userId: string) => void;
  onLockUsername?: (userId: string) => void;
  capabilities: UsernamePolicyAdminCapabilities;
}) {
  const paged = paginate(conflicts, page, PAGE_SIZE);

  if (conflicts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
        <p className="font-semibold text-white">Không có xung đột</p>
        <p className="mt-2 text-sm text-zinc-400">
          Hiện chưa phát hiện tài khoản nào vi phạm chính sách username.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Username</th>
            <th className="px-3 py-2">Tên hiển thị</th>
            <th className="px-3 py-2">Rule</th>
            <th className="px-3 py-2">Mức xử lý</th>
            <th className="px-3 py-2">Trạng thái</th>
            <th className="px-3 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((c) => (
            <tr className="border-b border-white/5" key={`${c.userId}-${c.field}-${c.ruleId}`}>
              <td className="px-3 py-2">
                <Link className="text-cyan-300 hover:underline" href={`/admin/users/${c.userId}`}>
                  {c.displayName ?? c.userId.slice(0, 8)}
                </Link>
              </td>
              <td className="px-3 py-2 text-zinc-300">@{c.username ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-300">{c.displayName ?? "—"}</td>
              <td className="px-3 py-2 text-zinc-400">
                {c.ruleValue} ({ruleTypeLabel(c.ruleType)})
              </td>
              <td className="px-3 py-2">{enforcementLabel(c.enforcementLevel)}</td>
              <td className="px-3 py-2">
                {c.hasException ? (
                  <span className="text-cyan-300">Có ngoại lệ</span>
                ) : (
                  <span className="text-amber-300">Cần xử lý</span>
                )}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  {capabilities.canManageExceptions && !c.hasException ? (
                    <button
                      className="text-cyan-300 hover:underline"
                      onClick={() => onAddException(c.ruleId, c.userId)}
                      type="button"
                    >
                      Thêm ngoại lệ
                    </button>
                  ) : null}
                  {capabilities.canAssignUsername ? (
                    <button
                      className="text-zinc-400 hover:text-white"
                      onClick={() => onManualAssign(c.userId)}
                      type="button"
                    >
                      Gán username
                    </button>
                  ) : null}
                  {capabilities.canManageRules && onLockUsername ? (
                    <button
                      className="text-zinc-400 hover:text-white"
                      onClick={() => onLockUsername(c.userId)}
                      type="button"
                    >
                      Khóa đổi username
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3">
        <Pagination onPage={onPage} page={paged.page} totalPages={paged.totalPages} />
      </div>
    </div>
  );
}

export function UsernamePolicyHistoryTable({
  history,
  page,
  onPage
}: {
  history: UsernameChangeHistoryRow[];
  page: number;
  onPage: (p: number) => void;
}) {
  const paged = paginate(history, page, PAGE_SIZE);

  if (history.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có lịch sử đổi username.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">User</th>
            <th className="px-3 py-2">Cũ → Mới</th>
            <th className="px-3 py-2">Người thực hiện</th>
            <th className="px-3 py-2">Lý do</th>
            <th className="px-3 py-2">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((row) => (
            <tr className="border-b border-white/5 text-zinc-300" key={row.id}>
              <td className="px-3 py-2">
                <Link className="text-cyan-300 hover:underline" href={`/admin/users/${row.user_id}`}>
                  {row.profiles?.display_name ?? row.profiles?.username ?? row.user_id.slice(0, 8)}
                </Link>
              </td>
              <td className="px-3 py-2">
                <span className="text-zinc-500">{row.old_username ?? "—"}</span>
                {" → "}
                <span className="text-cyan-200">{row.new_username}</span>
              </td>
              <td className="px-3 py-2 text-xs">
                {row.changed_by
                  ? row.changer?.display_name ?? row.changer?.username ?? "Admin"
                  : "User tự đổi"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">{row.change_reason ?? "—"}</td>
              <td className="px-3 py-2 text-xs">
                {new Date(row.created_at).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3">
        <Pagination onPage={onPage} page={paged.page} totalPages={paged.totalPages} />
      </div>
    </div>
  );
}

export function UsernamePolicyAuditTable({
  logs,
  page,
  onPage,
  capabilities
}: {
  logs: UsernamePolicyAuditLogRow[];
  page: number;
  onPage: (p: number) => void;
  capabilities: UsernamePolicyAdminCapabilities;
}) {
  if (!capabilities.canViewAudit) {
    return <p className="text-sm text-zinc-400">Bạn không có quyền xem audit log.</p>;
  }

  const paged = paginate(logs, page, PAGE_SIZE);

  if (logs.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có audit log liên quan username policy.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.02] text-xs text-zinc-500">
          <tr>
            <th className="px-3 py-2">Hành động</th>
            <th className="px-3 py-2">Admin</th>
            <th className="px-3 py-2">Đối tượng</th>
            <th className="px-3 py-2">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {paged.items.map((log) => (
            <tr className="border-b border-white/5 text-zinc-300" key={log.id}>
              <td className="px-3 py-2 text-white">{log.action}</td>
              <td className="px-3 py-2 text-xs">
                {log.actor?.display_name ?? log.actor?.username ?? "—"}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500">
                {log.target_type ?? "—"} {log.target_id ? log.target_id.slice(0, 8) : ""}
              </td>
              <td className="px-3 py-2 text-xs">
                {new Date(log.created_at).toLocaleString("vi-VN")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3">
        <Pagination onPage={onPage} page={paged.page} totalPages={paged.totalPages} />
      </div>
    </div>
  );
}
