"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import {
  createMessagingRestrictionAction,
  logMessagingCaseViewedAction,
  updateMessageReportStatusAction
} from "@/lib/admin/messaging-safety-actions";
import { warnMessagingUserAction } from "@/lib/admin/messaging-moderation-actions";
import {
  MESSAGING_RESTRICTION_LABELS,
  REPORT_STATUS_LABELS,
  RISK_LEVEL_LABELS
} from "@/lib/messaging/labels";
import { messageReportReasons } from "@/types/messages";
import type { MessageReportCaseDetail } from "@/types/messaging-safety";
import type { MessagingRestrictionType } from "@/types/messaging-safety";

type Props = {
  reportId: string;
  moderatorId: string;
  canViewContent: boolean;
  loadCase: (reportId: string) => Promise<MessageReportCaseDetail | null>;
  onClose: () => void;
  onRefresh: () => void;
  onRestrict: (userId: string, label: string) => void;
};

function reasonLabel(code: string) {
  return messageReportReasons.find((r) => r.value === code)?.label ?? code;
}

export function MessagingReportDetailDrawer({
  reportId,
  moderatorId,
  canViewContent,
  loadCase,
  onClose,
  onRefresh,
  onRestrict
}: Props) {
  const [detail, setDetail] = useState<MessageReportCaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadCase(reportId).then((data) => {
      if (!cancelled) {
        setDetail(data);
        setLoading(false);
      }
    });
    void logMessagingCaseViewedAction({ moderatorId, reportId });
    return () => {
      cancelled = true;
    };
  }, [reportId, loadCase, moderatorId]);

  async function applyRestriction(type: MessagingRestrictionType) {
    if (!detail) return;
    startTransition(async () => {
      await createMessagingRestrictionAction({
        moderatorId,
        userId: detail.reportedUser.id,
        restrictionType: type,
        reasonCode: "harassment",
        notifyUser: true
      });
      onRefresh();
    });
  }

  if (loading) {
    return <DrawerShell onClose={onClose} title="Đang tải case…" />;
  }

  if (!detail) {
    return (
      <DrawerShell onClose={onClose} title="Không tìm thấy báo cáo">
        <p className="text-sm text-zinc-400">Báo cáo không tồn tại hoặc đã bị xóa.</p>
      </DrawerShell>
    );
  }

  const reportedLabel =
    detail.reportedUser.displayName ??
    detail.reportedUser.username ??
    detail.reportedUser.id;

  return (
    <DrawerShell onClose={onClose} title={`Case #${detail.id.slice(0, 8)}`}>
      <div className="space-y-4">
        <Card className="space-y-2 p-3 text-sm">
          <Row label="Report ID" value={detail.id} />
          <Row
            label="Người báo cáo"
            value={
              detail.reporter.displayName ??
              detail.reporter.username ??
              detail.reporter.id
            }
          />
          <Row label="Người bị báo cáo" value={reportedLabel} />
          <Row label="Trạng thái" value={REPORT_STATUS_LABELS[detail.status] ?? detail.status} />
          <Row label="Loại vi phạm" value={reasonLabel(detail.reasonCode)} />
          <Row label="Mức rủi ro" value={RISK_LEVEL_LABELS[detail.riskLevel]} />
          <Row
            label="Thời gian"
            value={new Date(detail.createdAt).toLocaleString("vi-VN")}
          />
        </Card>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Tin nhắn bị báo cáo</h3>
          {!canViewContent ? (
            <p className="rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-500">
              Tài khoản của bạn chỉ xem được metadata case. Không có quyền đọc nội dung tin.
            </p>
          ) : detail.contextMessages.length ? (
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-white/5 p-2">
              {detail.contextMessages.map((msg) => (
                <p
                  className={`break-words text-xs ${
                    msg.isReported ? "text-amber-100" : "text-zinc-500"
                  }`}
                  key={msg.id}
                >
                  {msg.isContextOnly ? "[ngữ cảnh] " : "[bị report] "}
                  {new Date(msg.createdAt).toLocaleTimeString("vi-VN")}: {msg.body}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Không có nội dung tin để hiển thị.</p>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Tín hiệu an toàn</h3>
          <Card className="grid gap-1 p-3 text-xs text-zinc-400">
            <p>Link ngoài: {detail.safetySignals.hasExternalLink ? "Có" : "Không"}</p>
            <p>Từ khóa bị chặn: {detail.safetySignals.hasBlockedKeyword ? "Có" : "Không"}</p>
            <p>Tài khoản mới: {detail.safetySignals.senderIsNewAccount ? "Có" : "Không"}</p>
            <p>
              Người nhận khác nhau 24h: {detail.safetySignals.senderRecipients24h}
            </p>
            <p>Report 30 ngày (người gửi): {detail.safetySignals.senderReportCount30d}</p>
            <p>
              Người nhận là tác giả:{" "}
              {detail.safetySignals.recipientIsAuthor ? "Có" : "Không"}
            </p>
          </Card>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-white">Lịch sử người bị báo cáo</h3>
          <Card className="grid gap-1 p-3 text-xs text-zinc-400">
            <p>Report 30 ngày: {detail.reportedUserHistory.reports30d}</p>
            <p>Cảnh báo: {detail.reportedUserHistory.warnings}</p>
            <p>Lần bị hạn chế: {detail.reportedUserHistory.restrictionCount}</p>
            <p>
              Hạn chế hiện tại:{" "}
              {detail.reportedUserHistory.activeRestriction
                ? MESSAGING_RESTRICTION_LABELS[
                    detail.reportedUserHistory
                      .activeRestriction as MessagingRestrictionType
                  ] ?? detail.reportedUserHistory.activeRestriction
                : "Không"}
            </p>
          </Card>
        </section>

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await warnMessagingUserAction({
                  moderatorId,
                  userId: detail.reportedUser.id
                });
                onRefresh();
              })
            }
            type="button"
            variant="secondary"
          >
            Cảnh báo
          </Button>
          <Button
            disabled={pending}
            onClick={() => applyRestriction("mute_24h")}
            type="button"
            variant="danger"
          >
            Hạn chế 24h
          </Button>
          <Button
            disabled={pending}
            onClick={() => applyRestriction("mute_7d")}
            type="button"
            variant="danger"
          >
            7 ngày
          </Button>
          <Button
            disabled={pending}
            onClick={() => applyRestriction("mute_30d")}
            type="button"
            variant="danger"
          >
            30 ngày
          </Button>
          <Button
            disabled={pending}
            onClick={() => applyRestriction("permanent_messaging_ban")}
            type="button"
            variant="danger"
          >
            Vĩnh viễn
          </Button>
          <Button
            onClick={() => onRestrict(detail.reportedUser.id, reportedLabel)}
            type="button"
            variant="secondary"
          >
            Hạn chế khác…
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await updateMessageReportStatusAction({
                  moderatorId,
                  reportId: detail.id,
                  status: "dismissed",
                  resolution: "Không vi phạm"
                });
                onClose();
                onRefresh();
              })
            }
            type="button"
            variant="secondary"
          >
            Không vi phạm
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await updateMessageReportStatusAction({
                  moderatorId,
                  reportId: detail.id,
                  status: "resolved",
                  resolution: "Đã xử lý"
                });
                onClose();
                onRefresh();
              })
            }
            type="button"
            variant="secondary"
          >
            Đóng report
          </Button>
          {detail.reportedUser.username ? (
            <Link
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-sm text-cyan-300"
              href={`/admin/users?search=${detail.reportedUser.username}`}
            >
              Hồ sơ người dùng →
            </Link>
          ) : null}
        </div>
      </div>
    </DrawerShell>
  );
}

function DrawerShell({
  title,
  children,
  onClose
}: {
  title: string;
  children?: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[190] flex justify-end">
      <button
        aria-label="Đóng"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        type="button"
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0b1016] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <h2 className="text-base font-bold text-white">{title}</h2>
          <button
            className="text-sm text-zinc-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-zinc-300">
      <span className="text-zinc-500">{label}: </span>
      {value}
    </p>
  );
}
