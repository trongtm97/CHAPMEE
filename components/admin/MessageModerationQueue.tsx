"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  applyMessageReportAction,
  type MessageModerationAction
} from "@/lib/messages/admin-message-moderation";
import type { MessageModerationReportItem } from "@/types/messages";
import { messageReportReasons } from "@/types/messages";

type MessageModerationQueueProps = {
  reports: MessageModerationReportItem[];
  moderatorId: string;
};

const actions: { value: MessageModerationAction; label: string }[] = [
  { value: "no_violation", label: "Không vi phạm" },
  { value: "warn_user", label: "Cảnh cáo" },
  { value: "delete_message", label: "Xóa tin nhắn" },
  { value: "restrict_24h", label: "Hạn chế nhắn tin 24h" },
  { value: "restrict_7d", label: "Hạn chế 7 ngày" },
  { value: "restrict_30d", label: "Hạn chế 30 ngày" },
  { value: "suspend", label: "Tạm khóa tài khoản" },
  { value: "ban", label: "Cấm nhắn tin" },
  { value: "reporter_abuse", label: "Báo cáo sai" }
];

function reasonLabel(code: string) {
  return messageReportReasons.find((r) => r.value === code)?.label ?? code;
}

export function MessageModerationQueue({
  reports,
  moderatorId
}: MessageModerationQueueProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!reports.length) {
    return (
      <Card className="p-6 text-center text-sm text-zinc-400">
        Không có báo cáo tin nhắn đang chờ.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <Card className="space-y-3 p-4" key={report.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">
                {reasonLabel(report.reasonCode)}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(report.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
              {report.status}
            </span>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <p className="text-zinc-300">
              <span className="text-zinc-500">Báo cáo bởi: </span>
              {report.reporter.displayName ?? report.reporter.username ?? report.reporter.id}
            </p>
            <p className="text-zinc-300">
              <span className="text-zinc-500">Bị báo cáo: </span>
              {report.reportedUser.displayName ??
                report.reportedUser.username ??
                report.reportedUser.id}
            </p>
          </div>
          {report.priorReportCount > 1 ? (
            <p className="text-xs text-amber-300/90">
              Đã có {report.priorReportCount} báo cáo liên quan tới người dùng này.
            </p>
          ) : null}
          {report.messagePreview ? (
            <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-zinc-200">
              {report.messagePreview}
            </p>
          ) : null}
          {report.detail ? (
            <p className="text-xs text-zinc-500">{report.detail}</p>
          ) : null}
          {report.contextMessages.length ? (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/5 p-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-600">
                Ngữ cảnh (5 tin trước / sau)
              </p>
              {report.contextMessages.map((msg) => (
                <p className="text-xs text-zinc-400" key={msg.id}>
                  <span className="text-zinc-600">
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN")}:{" "}
                  </span>
                  {msg.body}
                </p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <Button
                disabled={pending}
                key={action.value}
                onClick={() =>
                  startTransition(async () => {
                    await applyMessageReportAction({
                      moderatorId,
                      reportId: report.id,
                      action: action.value
                    });
                    router.refresh();
                  })
                }
                type="button"
                variant={action.value.includes("restrict") || action.value === "ban" ? "danger" : "secondary"}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
