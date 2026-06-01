import { Card } from "@/components/ui";
import type { AlgorithmSettingAuditRow } from "@/types/algorithm-settings";

type AlgorithmAuditTabProps = {
  logs: AlgorithmSettingAuditRow[];
};

function formatJson(value: unknown) {
  if (value === null || value === undefined) return "—";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function AlgorithmAuditTab({ logs }: AlgorithmAuditTabProps) {
  if (logs.length === 0) {
    return (
      <Card className="p-6 text-sm text-zinc-400">
        Chưa có thay đổi nào được ghi nhận.
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <Card className="space-y-2 p-4" key={log.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-mono text-sm font-bold text-cyan-200">{log.setting_key}</p>
              <p className="text-xs text-zinc-500">
                {new Date(log.created_at).toLocaleString("vi-VN")}
                {log.changer?.display_name || log.changer?.username
                  ? ` · ${log.changer.display_name ?? log.changer.username}`
                  : ""}
              </p>
            </div>
            {log.reason ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                {log.reason}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2 text-xs md:grid-cols-2">
            <div>
              <p className="text-zinc-500">Trước</p>
              <p className="break-all font-mono text-zinc-300">{formatJson(log.old_value)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Sau</p>
              <p className="break-all font-mono text-zinc-100">{formatJson(log.new_value)}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
