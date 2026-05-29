"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CreatorDetailDrawer } from "@/components/admin/creators/CreatorDetailDrawer";
import { Button } from "@/components/ui";
import {
  enforcementLabel,
  matchTypeLabel,
  ruleTypeLabel,
  scopeLabel
} from "@/lib/admin/username-policy-labels";
import {
  archiveUsernamePolicyRuleAction,
  revokeAllowedUserFromRuleAction,
  updateUsernamePolicyRuleAction
} from "@/lib/admin/update-username-policy-rule";
import type {
  UsernamePolicyAdminCapabilities,
  UsernamePolicyAuditLogRow,
  UsernamePolicyConflictItem,
  UsernamePolicyRuleRow
} from "@/types/username-policy";

const DRAWER_TABS = ["overview", "exceptions", "affected", "history", "audit"] as const;
type DrawerTab = (typeof DRAWER_TABS)[number];

const TAB_LABELS: Record<DrawerTab, string> = {
  overview: "Tổng quan",
  exceptions: "Ngoại lệ",
  affected: "Tài khoản bị ảnh hưởng",
  history: "Lịch sử thay đổi",
  audit: "Audit log"
};

type Props = {
  open: boolean;
  rule: UsernamePolicyRuleRow | null;
  conflicts: UsernamePolicyConflictItem[];
  auditLogs: UsernamePolicyAuditLogRow[];
  capabilities: UsernamePolicyAdminCapabilities;
  onClose: () => void;
  onRefresh: () => void;
  onAddException: (rule: UsernamePolicyRuleRow) => void;
  onEdit?: (rule: UsernamePolicyRuleRow) => void;
};

export function UsernamePolicyRuleDrawer({
  open,
  rule,
  conflicts,
  auditLogs,
  capabilities,
  onClose,
  onRefresh,
  onAddException,
  onEdit
}: Props) {
  const [tab, setTab] = useState<DrawerTab>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!rule) return null;

  const activeRule = rule;
  const ruleConflicts = conflicts.filter((c) => c.ruleId === activeRule.id);
  const ruleAudits = auditLogs.filter(
    (a) => a.target_id === activeRule.id || a.metadata?.rule_id === activeRule.id
  );

  function toggleActive() {
    startTransition(async () => {
      const res = await updateUsernamePolicyRuleAction({
        ruleId: activeRule.id,
        isActive: !activeRule.is_active
      });
      setMessage(res.error ?? (activeRule.is_active ? "Đã tắt rule." : "Đã bật rule."));
      if (res.ok) onRefresh();
    });
  }

  function archive() {
    startTransition(async () => {
      const res = await archiveUsernamePolicyRuleAction({ ruleId: activeRule.id });
      setMessage(res.error ?? "Đã lưu trữ rule.");
      if (res.ok) {
        onRefresh();
        onClose();
      }
    });
  }

  function revokeUser(userId: string) {
    startTransition(async () => {
      const res = await revokeAllowedUserFromRuleAction({ ruleId: activeRule.id, userId });
      setMessage(res.error ?? "Đã thu hồi ngoại lệ.");
      if (res.ok) onRefresh();
    });
  }

  return (
    <CreatorDetailDrawer onClose={onClose} open={open}>
      <div className="flex h-full flex-col">
        <div className="border-b border-white/10 p-4">
          <button className="text-sm text-zinc-400 hover:text-white" onClick={onClose} type="button">
            Đóng
          </button>
          <h2 className="mt-2 text-xl font-bold text-white">{activeRule.value}</h2>
          <p className="text-sm text-zinc-400">{ruleTypeLabel(activeRule.rule_type)}</p>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-4 py-2">
          {DRAWER_TABS.map((t) => (
            <button
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === t ? "bg-cyan-300 text-zinc-950" : "text-zinc-400"
              }`}
              key={t}
              onClick={() => setTab(t)}
              type="button"
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 text-sm text-zinc-300">
          {tab === "overview" ? (
            <dl className="space-y-2">
              <div>
                <dt className="text-zinc-500">Kiểu khớp</dt>
                <dd>{matchTypeLabel(activeRule.match_type)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Phạm vi</dt>
                <dd>{scopeLabel(activeRule.scope)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Mức xử lý</dt>
                <dd>{enforcementLabel(activeRule.enforcement_level)}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Trạng thái</dt>
                <dd>{activeRule.is_active ? "Đang bật" : "Đã tắt"}</dd>
              </div>
              {capabilities.canViewSensitiveNotes && activeRule.note ? (
                <div>
                  <dt className="text-zinc-500">Ghi chú</dt>
                  <dd>{activeRule.note}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-zinc-500">Cập nhật</dt>
                <dd>{new Date(activeRule.updated_at).toLocaleString("vi-VN")}</dd>
              </div>
            </dl>
          ) : null}
          {tab === "exceptions" ? (
            <div className="space-y-2">
              {(activeRule.allowed_user_ids ?? []).length === 0 ? (
                <p className="text-zinc-500">Chưa có ngoại lệ.</p>
              ) : (
                (activeRule.allowed_user_ids ?? []).map((uid) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2"
                    key={uid}
                  >
                    <Link className="text-cyan-300 hover:underline" href={`/admin/users/${uid}`}>
                      {uid.slice(0, 8)}…
                    </Link>
                    {capabilities.canManageExceptions ? (
                      <button
                        className="text-xs text-red-300"
                        disabled={isPending}
                        onClick={() => revokeUser(uid)}
                        type="button"
                      >
                        Thu hồi
                      </button>
                    ) : null}
                  </div>
                ))
              )}
              {capabilities.canManageExceptions ? (
                <Button onClick={() => onAddException(activeRule)} type="button" variant="ghost">
                  Thêm ngoại lệ
                </Button>
              ) : null}
            </div>
          ) : null}
          {tab === "affected" ? (
            <div className="space-y-2">
              {ruleConflicts.length === 0 ? (
                <p className="text-zinc-500">Không có tài khoản khớp rule.</p>
              ) : (
                ruleConflicts.map((c) => (
                  <div className="rounded-lg border border-white/10 px-3 py-2" key={`${c.userId}-${c.field}`}>
                    <Link className="font-medium text-white hover:underline" href={`/admin/users/${c.userId}`}>
                      {c.displayName ?? c.username ?? c.userId}
                    </Link>
                    <p className="text-xs text-zinc-500">
                      @{c.username ?? "—"} · {c.field}
                      <span
                        className={
                          c.hasException ? "text-cyan-300" : "text-amber-300"
                        }
                      >
                        {" "}
                        · {c.hasException ? "Được ngoại lệ" : "Đang vi phạm"}
                      </span>
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}
          {tab === "history" ? (
            <div className="space-y-2">
              {ruleAudits.length === 0 ? (
                <p className="text-zinc-500">Chưa có lịch sử thay đổi.</p>
              ) : (
                ruleAudits.map((a) => (
                  <div className="rounded-lg border border-white/10 px-3 py-2 text-xs" key={a.id}>
                    <p className="font-medium text-white">{a.action}</p>
                    <p className="text-zinc-500">
                      {a.actor?.display_name ?? a.actor?.username ?? "Hệ thống"} ·{" "}
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}
          {tab === "audit" ? (
            <div className="space-y-2">
              {ruleAudits.length === 0 ? (
                <p className="text-zinc-500">Chưa có audit log cho rule này.</p>
              ) : (
                ruleAudits.map((a) => (
                  <div className="rounded-lg border border-white/10 px-3 py-2 text-xs" key={`audit-${a.id}`}>
                    <p className="text-white">{a.action}</p>
                    <p className="text-zinc-500">
                      {new Date(a.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
        {capabilities.canManageRules ? (
          <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
            {onEdit ? (
              <Button onClick={() => onEdit(activeRule)} type="button" variant="ghost">
                Sửa rule
              </Button>
            ) : null}
            <Button disabled={isPending} onClick={toggleActive} type="button" variant="ghost">
              {activeRule.is_active ? "Tắt" : "Bật"}
            </Button>
            <Button disabled={isPending} onClick={archive} type="button" variant="ghost">
              Lưu trữ
            </Button>
          </div>
        ) : null}
        {message ? <p className="px-4 pb-4 text-sm text-cyan-200">{message}</p> : null}
      </div>
    </CreatorDetailDrawer>
  );
}
