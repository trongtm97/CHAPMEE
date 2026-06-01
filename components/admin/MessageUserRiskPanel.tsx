"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfileUrlOrFallback } from "@/lib/profile/profile-url";
import { useState, useTransition } from "react";
import { AvatarFallback, Button, Card } from "@/components/ui";
import {
  addMessagingModerationNoteAction,
  liftUserMessagingRestrictionAction,
  restrictUserMessagingAction,
  warnMessagingUserAction
} from "@/lib/admin/messaging-moderation-actions";
import { restrictionLabel } from "@/lib/admin/messaging-risk-score";
import { messageReportReasons } from "@/types/messages";
import type { MessageUserRiskDetail } from "@/types/admin-messaging";

type MessageUserRiskPanelProps = {
  detail: MessageUserRiskDetail;
  moderatorId: string;
  onClose: () => void;
};

function reasonLabel(code: string) {
  return messageReportReasons.find((r) => r.value === code)?.label ?? code;
}

export function MessageUserRiskPanel({
  detail,
  moderatorId,
  onClose
}: MessageUserRiskPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[180] flex justify-end">
      <button
        aria-label="Đóng bảng chi tiết"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        type="button"
      />
      <aside
        aria-labelledby="message-risk-panel-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0b1016] shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-2 border-b border-white/10 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <AvatarFallback
              className="!size-12"
              name={detail.displayName}
              size="sm"
              src={detail.avatarUrl}
            />
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white" id="message-risk-panel-title">
                {detail.displayName}
              </h2>
              {detail.username ? (
                <p className="truncate text-xs text-zinc-500">@{detail.username}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-500">
                Vai trò: {detail.role} · Điểm rủi ro:{" "}
                <span className="font-semibold text-cyan-200">{detail.riskScore}</span>
              </p>
            </div>
          </div>
          <button
            className="min-h-9 rounded-full px-3 text-sm text-zinc-400 hover:bg-white/5"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {detail.username ? (
            <Link
              className="text-sm text-cyan-300 hover:text-cyan-200"
              href={getProfileUrlOrFallback(detail.username)}
              target="_blank"
            >
              Xem hồ sơ công khai →
            </Link>
          ) : null}

          <Card className="grid grid-cols-2 gap-2 p-3 text-sm">
            <Stat label="Báo cáo mở" value={detail.openReports} />
            <Stat label="Báo cáo 7 ngày" value={detail.reports7d} />
            <Stat label="Bị lọc chặn" value={detail.safetyBlocked} />
            <Stat label="Chờ duyệt" value={detail.safetyWarnings} />
            <Stat label="Yêu cầu 24h" value={detail.requests24h} />
            <Stat label="Bị user chặn" value={detail.blocksReceived} />
          </Card>

          {detail.activeRestrictions.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Hạn chế hiện tại</p>
              {detail.activeRestrictions.map((r) => (
                <p
                  className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-3 py-2 text-xs text-amber-100"
                  key={r.id}
                >
                  {restrictionLabel(r.restrictionType) ?? r.restrictionType}
                  {r.endsAt
                    ? ` · đến ${new Date(r.endsAt).toLocaleString("vi-VN")}`
                    : " · vĩnh viễn"}
                  {r.reason ? (
                    <span className="mt-1 block text-amber-200/70">{r.reason}</span>
                  ) : null}
                </p>
              ))}
            </div>
          ) : null}

          {detail.recentReports.length ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Báo cáo gần đây</p>
              <ul className="space-y-2">
                {detail.recentReports.map((r) => (
                  <li
                    className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                    key={r.id}
                  >
                    <p className="font-medium text-zinc-200">{reasonLabel(r.reasonCode)}</p>
                    <p className="text-zinc-500">
                      {r.reporterName} · {new Date(r.createdAt).toLocaleString("vi-VN")} ·{" "}
                      {r.status}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="block text-xs text-zinc-500">
            Ghi chú / lý do hành động
            <textarea
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-zinc-200"
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              value={note}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  warnMessagingUserAction({
                    moderatorId,
                    userId: detail.userId,
                    note: note.trim() || null
                  })
                )
              }
              type="button"
              variant="secondary"
            >
              Cảnh cáo
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  restrictUserMessagingAction({
                    moderatorId,
                    userId: detail.userId,
                    duration: "24h",
                    note: note.trim() || null
                  })
                )
              }
              type="button"
              variant="danger"
            >
              Hạn chế 24h
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  restrictUserMessagingAction({
                    moderatorId,
                    userId: detail.userId,
                    duration: "7d",
                    note: note.trim() || null
                  })
                )
              }
              type="button"
              variant="danger"
            >
              7 ngày
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  restrictUserMessagingAction({
                    moderatorId,
                    userId: detail.userId,
                    duration: "30d",
                    note: note.trim() || null
                  })
                )
              }
              type="button"
              variant="danger"
            >
              30 ngày
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  liftUserMessagingRestrictionAction({
                    moderatorId,
                    userId: detail.userId,
                    note: note.trim() || null
                  })
                )
              }
              type="button"
              variant="ghost"
            >
              Gỡ hạn chế
            </Button>
            <Button
              disabled={pending || !note.trim()}
              onClick={() =>
                run(() =>
                  addMessagingModerationNoteAction({
                    moderatorId,
                    userId: detail.userId,
                    note: note.trim()
                  })
                )
              }
              type="button"
              variant="ghost"
            >
              Lưu ghi chú
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2 py-1.5">
      <p className="text-lg font-bold tabular-nums text-white">{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
