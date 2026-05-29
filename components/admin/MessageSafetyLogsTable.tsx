import { Card } from "@/components/ui";
import type { MessageSafetyLogItem } from "@/types/admin-messaging";

const STATUS_LABEL: Record<MessageSafetyLogItem["status"], string> = {
  blocked: "Bị chặn",
  review: "Chờ duyệt",
  warning: "Cảnh báo"
};

type MessageSafetyLogsTableProps = {
  logs: MessageSafetyLogItem[];
};

export function MessageSafetyLogsTable({ logs }: MessageSafetyLogsTableProps) {
  if (!logs.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Chưa có log an toàn tin nhắn trong khoảng thời gian đã chọn.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-xs text-zinc-500">
              <th className="px-3 py-2.5 font-medium">Thời gian</th>
              <th className="px-3 py-2.5 font-medium">Users</th>
              <th className="px-3 py-2.5 font-medium">Trạng thái</th>
              <th className="px-3 py-2.5 font-medium">Lý do</th>
              <th className="px-3 py-2.5 font-medium">Xem trước</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr className="border-b border-white/5 last:border-0" key={log.id}>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-zinc-500">
                  {new Date(log.createdAt).toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2.5">
                  <p className="font-medium text-zinc-200">{log.displayName}</p>
                  {log.username ? (
                    <p className="text-xs text-zinc-500">@{log.username}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      log.status === "blocked"
                        ? "bg-red-400/12 text-red-200"
                        : log.status === "review"
                          ? "bg-amber-400/12 text-amber-100"
                          : "bg-zinc-500/15 text-zinc-300"
                    }`}
                  >
                    {STATUS_LABEL[log.status]}
                  </span>
                </td>
                <td className="max-w-[10rem] px-3 py-2.5 text-xs text-zinc-400">
                  {log.reasons.join(", ") || "—"}
                </td>
                <td className="max-w-xs px-3 py-2.5 text-xs text-zinc-400">
                  <p className="line-clamp-2 break-words">{log.textPreview}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
