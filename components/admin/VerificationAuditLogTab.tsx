"use client";

import type { VerificationAuditEntry } from "@/types/admin-verification";

const ACTION_LABELS: Record<string, string> = {
  verification_request_viewed: "Xem chi tiết",
  verification_approved: "Duyệt xác thực",
  verification_grant: "Duyệt xác thực",
  verification_rejected: "Từ chối",
  verification_reject: "Từ chối",
  verification_needs_more_info: "Yêu cầu bổ sung",
  verification_revoked: "Thu hồi",
  verification_revoke: "Thu hồi",
  verification_manual_granted: "Cấp thủ công",
  verification_public_badge_enabled: "Bật badge công khai",
  verification_public_badge_disabled: "Tắt badge công khai",
  verification_label_changed: "Đổi nhãn công khai",
  verification_update: "Cập nhật",
  verification_note_added: "Thêm ghi chú"
};

type Props = {
  logs: VerificationAuditEntry[];
};

export function VerificationAuditLogTab({ logs }: Props) {
  if (logs.length === 0) {
    return <p className="text-sm text-zinc-400">Chưa có audit log.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs text-zinc-500">
          <tr>
            <th className="pb-2 pr-3">Thời gian</th>
            <th className="pb-2 pr-3">Admin</th>
            <th className="pb-2 pr-3">Hành động</th>
            <th className="pb-2">Chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr className="border-t border-white/5" key={log.id}>
              <td className="py-2 pr-3 text-zinc-400">
                {new Date(log.createdAt).toLocaleString("vi-VN")}
              </td>
              <td className="py-2 pr-3 text-zinc-300">{log.actorName ?? "—"}</td>
              <td className="py-2 pr-3 text-zinc-200">
                {ACTION_LABELS[log.action] ?? log.action}
              </td>
              <td className="py-2 text-xs text-zinc-500">
                {log.reason ?? ""}
                {log.oldValue ? ` · ${truncate(log.oldValue)}` : ""}
                {log.newValue ? ` → ${truncate(log.newValue)}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function truncate(value: string, max = 48) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
