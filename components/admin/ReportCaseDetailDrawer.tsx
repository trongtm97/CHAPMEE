"use client";

import Link from "next/link";
import { Badge, Button } from "@/components/ui";
import {
  reportReasonLabel,
  reportSeverityLabel,
  reportStatusLabel,
  reportTargetLabel
} from "@/lib/admin/report-labels";
import type { ReportCaseDetail } from "@/types/reports";

type ReportCaseDetailDrawerProps = {
  open: boolean;
  detail: ReportCaseDetail | null;
  loading?: boolean;
  canModerate: boolean;
  actionDisabled?: boolean;
  onClose: () => void;
  onAssign: () => void;
  onDismiss: () => void;
  onResolve: () => void;
  onHideContent: () => void;
  onWarn: () => void;
  onEscalate: () => void;
};

export function ReportCaseDetailDrawer({
  open,
  detail,
  loading,
  canModerate,
  actionDisabled,
  onClose,
  onAssign,
  onDismiss,
  onResolve,
  onHideContent,
  onWarn,
  onEscalate
}: ReportCaseDetailDrawerProps) {
  if (!open) return null;

  const item = detail?.case;
  const isActive = item?.status === "pending" || item?.status === "reviewing";

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60">
      <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0c1118] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h2 className="font-semibold text-white">Chi tiết báo cáo</h2>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-zinc-500">Đang tải…</p>
          ) : !detail || !item ? (
            <p className="text-sm text-zinc-500">Không có dữ liệu.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{reportTargetLabel(item.targetType)}</Badge>
                  <Badge variant="warning">{reportStatusLabel(item.status)}</Badge>
                  <Badge variant="danger">{reportSeverityLabel(item.severity)}</Badge>
                </div>
                <h3 className="mt-2 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">
                  ID: {item.targetId.slice(0, 8)}… · {item.reportCount} báo cáo
                </p>
              </div>

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Tổng quan</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Lý do chính: {reportReasonLabel(item.primaryReasonCode)}</li>
                  {detail.reportedUserName ? (
                    <li>Người bị report: {detail.reportedUserName}</li>
                  ) : null}
                  {detail.assignedToName ? (
                    <li>Người xử lý: {detail.assignedToName}</li>
                  ) : null}
                </ul>
              </section>

              {detail.targetBody ? (
                <section>
                  <h4 className="text-sm font-medium text-zinc-300">Nội dung bị report</h4>
                  <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-400">
                    {detail.targetBody}
                  </p>
                </section>
              ) : null}

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Lịch sử</h4>
                <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                  <li>Report trước đây (target): {detail.targetReportHistory}</li>
                  <li>Report liên quan user: {detail.userReportHistory}</li>
                </ul>
              </section>

              <section>
                <h4 className="text-sm font-medium text-zinc-300">Danh sách báo cáo</h4>
                <ul className="mt-2 divide-y divide-white/5 rounded-lg border border-white/10">
                  {detail.reports.map((r) => (
                    <li className="px-3 py-2 text-sm" key={r.id}>
                      <p className="text-zinc-300">
                        {r.reporterName ?? "Ẩn danh"} ·{" "}
                        {reportReasonLabel(r.reasonCode)}
                      </p>
                      {r.reasonText ? (
                        <p className="mt-1 text-xs text-zinc-500">{r.reasonText}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-zinc-600">
                        {new Date(r.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              {detail.targetHref ? (
                <Link
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                  href={detail.targetHref}
                  target="_blank"
                >
                  Mở nội dung →
                </Link>
              ) : null}
            </div>
          )}
        </div>

        {canModerate && isActive && item ? (
          <div className="space-y-2 border-t border-white/10 p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button disabled={actionDisabled} onClick={onAssign} type="button">
                Nhận xử lý
              </Button>
              <Button disabled={actionDisabled} onClick={onResolve} type="button" variant="secondary">
                Xử lý xong
              </Button>
              <Button disabled={actionDisabled} onClick={onHideContent} type="button" variant="secondary">
                Ẩn nội dung
              </Button>
              <Button disabled={actionDisabled} onClick={onWarn} type="button" variant="secondary">
                Cảnh báo
              </Button>
              <Button disabled={actionDisabled} onClick={onEscalate} type="button" variant="secondary">
                Chuyển cấp
              </Button>
              <Button disabled={actionDisabled} onClick={onDismiss} type="button" variant="danger">
                Bỏ qua
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
