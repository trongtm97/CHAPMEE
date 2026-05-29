import { Card } from "@/components/ui";
import type { AdminAuditLogRow } from "@/lib/admin/get-audit-logs";

type AuditLogTableProps = {
  logs: AdminAuditLogRow[];
};

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (!logs.length) {
    return (
      <Card className="p-4 text-sm text-zinc-400">
        Chưa có bản ghi audit nào.
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-800 text-sm">
        <thead className="bg-zinc-900/80 text-left text-zinc-400">
          <tr>
            <th className="px-3 py-2 font-medium">Thời gian</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Target</th>
            <th className="px-3 py-2 font-medium">Metadata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800 bg-zinc-950/50">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap px-3 py-2 text-zinc-300">
                {new Date(log.created_at).toLocaleString("vi-VN")}
              </td>
              <td className="px-3 py-2 text-zinc-300">
                {log.actor?.display_name ??
                  log.actor?.username ??
                  log.actor_id?.slice(0, 8) ??
                  "—"}
              </td>
              <td className="px-3 py-2 font-medium text-white">{log.action}</td>
              <td className="px-3 py-2 text-zinc-400">
                {log.target_type ?? "—"}
                <br />
                <span className="text-xs text-zinc-500">{log.target_id ?? "—"}</span>
              </td>
              <td className="max-w-xs px-3 py-2">
                {log.metadata && Object.keys(log.metadata).length > 0 ? (
                  <pre className="overflow-x-auto rounded bg-zinc-900/80 p-2 text-xs text-zinc-400">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
