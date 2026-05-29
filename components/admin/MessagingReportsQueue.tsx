"use client";

import { Button, Card } from "@/components/ui";
import { REPORT_STATUS_LABELS, RISK_LEVEL_LABELS } from "@/lib/messaging/labels";
import { messageReportReasons } from "@/types/messages";
import type { MessageReportQueueItem } from "@/types/messaging-safety";

type Props = {
  reports: MessageReportQueueItem[];
  onViewCase: (reportId: string) => void;
  onRestrict: (userId: string, label: string) => void;
};

function reasonLabel(code: string) {
  return messageReportReasons.find((r) => r.value === code)?.label ?? code;
}

export function MessagingReportsQueue({ reports, onViewCase, onRestrict }: Props) {
  if (!reports.length) {
    return (
      <Card className="p-8 text-center">
        <p className="font-medium text-white">Chưa có rủi ro nhắn tin</p>
        <p className="mt-2 text-sm text-zinc-400">
          Khi có báo cáo, tin bị chặn hoặc tài khoản gửi tin bất thường, dữ liệu sẽ xuất
          hiện tại đây.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const reportedLabel =
          report.reportedUser.displayName ??
          report.reportedUser.username ??
          report.reportedUser.id;

        return (
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
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
                  {REPORT_STATUS_LABELS[report.status] ?? report.status}
                </span>
                <span className="rounded-full border border-amber-400/20 px-2 py-0.5 text-xs text-amber-200">
                  {RISK_LEVEL_LABELS[report.riskLevel]}
                </span>
              </div>
            </div>

            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p className="text-zinc-300">
                <span className="text-zinc-500">Người báo cáo: </span>
                {report.reporter.displayName ?? report.reporter.username ?? report.reporter.id}
              </p>
              <p className="text-zinc-300">
                <span className="text-zinc-500">Bị báo cáo: </span>
                {reportedLabel}
              </p>
            </div>

            <p className="text-xs text-zinc-500">
              Đã bị report {report.priorReportCount} lần ·{" "}
              {report.hasBlockedLink ? "Có link" : "Không link"} · ID: {report.id.slice(0, 8)}
            </p>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onViewCase(report.id)} type="button" variant="secondary">
                Xem case
              </Button>
              <Button
                onClick={() => onRestrict(report.reportedUser.id, reportedLabel)}
                type="button"
                variant="danger"
              >
                Hạn chế nhắn tin
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
