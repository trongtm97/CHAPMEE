import { Card } from "@/components/ui";
import type { MessagingAuditLogRow } from "@/lib/admin/get-messaging-audit-logs";

type Props = {
  logs: MessagingAuditLogRow[];
};

export function MessagingAuditLogTable({ logs }: Props) {
  if (!logs.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Chưa có log xử lý nhắn tin trong khoảng thời gian đã chọn.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((row) => (
        <Card className="space-y-1 p-3 text-sm" key={row.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <p className="font-medium text-white">{row.action}</p>
            <p className="text-xs text-zinc-500">
              {new Date(row.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <p className="text-xs text-zinc-500">
            {row.actorName}
            {row.targetType ? ` · ${row.targetType}` : ""}
            {row.targetId ? ` · ${row.targetId.slice(0, 8)}` : ""}
          </p>
        </Card>
      ))}
    </div>
  );
}
