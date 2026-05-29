"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  applyMessageReportAction,
  type MessageModerationAction
} from "@/lib/messages/admin-message-moderation";
import type { MessageModerationReportItem } from "@/types/messages";
import { messageReportReasons } from "@/types/messages";

type MessageReportsQueueProps = {
  reports: MessageModerationReportItem[];
  moderatorId: string;
  onInspectUser?: (userId: string) => void;
};

const actions: { value: MessageModerationAction; label: string }[] = [
  { value: "no_violation", label: "Không vi phạm" },
  { value: "warn_user", label: "Cảnh cáo" },
  { value: "delete_message", label: "Gỡ tin nhắn" },
  { value: "restrict_24h", label: "Hạn chế 24h" },
  { value: "restrict_7d", label: "Hạn chế 7 ngày" },
  { value: "restrict_30d", label: "Hạn chế 30 ngày" },
  { value: "suspend", label: "Tạm khóa tài khoản" },
  { value: "ban", label: "Cấm nhắn tin" },
  { value: "reporter_abuse", label: "Báo cáo sai" }
];

function reasonLabel(code: string) {
  return messageReportReasons.find((r) => r.value === code)?.label ?? code;
}

export function MessageReportsQueue({
  reports,
  moderatorId,
  onInspectUser
}: MessageReportsQueueProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Record<string, string>>({});

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
              <button
                className="text-cyan-300 hover:text-cyan-200"
                onClick={() => onInspectUser?.(report.reportedUser.id)}
                type="button"
              >
                {report.reportedUser.displayName ??
                  report.reportedUser.username ??
                  report.reportedUser.id}
              </button>
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
              <p className="text-[10px] font-medium text-zinc-600">
                Ngữ cảnh (tối đa 5 tin trước / sau tin bị báo cáo)
              </p>
              {report.contextMessages.map((msg) => (
                <p className="break-words text-xs text-zinc-400" key={msg.id}>
                  <span className="text-zinc-600">
                    {new Date(msg.createdAt).toLocaleTimeString("vi-VN")}:{" "}
                  </span>
                  {msg.body}
                </p>
              ))}
            </div>
          ) : null}
          <label className="block text-xs text-zinc-500">
            Ghi chú nội bộ (tuỳ chọn)
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200"
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [report.id]: e.target.value }))
              }
              placeholder="Ghi chú cho audit log…"
              rows={2}
              value={notes[report.id] ?? ""}
            />
          </label>
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
                      action: action.value,
                      note: notes[report.id]?.trim() || null
                    });
                    router.refresh();
                  })
                }
                type="button"
                variant={
                  action.value.includes("restrict") ||
                  action.value === "ban" ||
                  action.value === "suspend"
                    ? "danger"
                    : "secondary"
                }
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
