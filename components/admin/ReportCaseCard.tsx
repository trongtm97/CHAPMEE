"use client";

import { Badge, Button } from "@/components/ui";
import {
  reportReasonLabel,
  reportSeverityLabel,
  reportStatusLabel,
  reportTargetLabel
} from "@/lib/admin/report-labels";
import type { ReportCaseQueueItem } from "@/types/reports";

type ReportCaseCardProps = {
  item: ReportCaseQueueItem;
  canModerate: boolean;
  disabled?: boolean;
  onView: () => void;
  onAssign: () => void;
  onDismiss: () => void;
  onResolve: () => void;
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Vừa xong";
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export function ReportCaseCard({
  item,
  canModerate,
  disabled,
  onView,
  onAssign,
  onDismiss,
  onResolve
}: ReportCaseCardProps) {
  const isActive = item.status === "pending" || item.status === "reviewing";

  return (
    <article
      className={`rounded-xl border p-4 transition ${
        isActive ? "border-white/10 bg-zinc-900/50" : "border-white/5 bg-zinc-900/20"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Badge variant="default">{reportTargetLabel(item.targetType)}</Badge>
          <h3 className="truncate text-base font-semibold text-white">{item.title}</h3>
        </div>
        <Badge variant={item.severity === "urgent" || item.severity === "high" ? "danger" : "warning"}>
          {reportSeverityLabel(item.severity)}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-zinc-400">
        {reportReasonLabel(item.primaryReasonCode)}
        {" · "}
        {item.reportCount} báo cáo
        {item.reporterCount > 1 ? ` · ${item.reporterCount} người gửi` : ""}
        {item.reportedUserName ? ` · Bị report: ${item.reportedUserName}` : ""}
        {" · "}
        {relativeTime(item.latestAt)}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Badge variant="default">{reportStatusLabel(item.status)}</Badge>
        {item.assignedToName ? <span>Người xử lý: {item.assignedToName}</span> : null}
      </div>

      {item.preview ? (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{item.preview}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button disabled={disabled} onClick={onView} type="button" variant="secondary">
          Xem chi tiết
        </Button>
        {canModerate && isActive ? (
          <>
            <Button disabled={disabled} onClick={onAssign} type="button">
              Nhận xử lý
            </Button>
            <Button disabled={disabled} onClick={onResolve} type="button" variant="secondary">
              Xử lý
            </Button>
            <Button disabled={disabled} onClick={onDismiss} type="button" variant="danger">
              Bỏ qua
            </Button>
          </>
        ) : null}
      </div>
    </article>
  );
}
