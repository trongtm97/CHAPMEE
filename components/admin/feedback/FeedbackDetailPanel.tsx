"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { FeedbackPriorityBadge } from "@/components/admin/feedback/FeedbackPriorityBadge";
import { FeedbackStatusBadge } from "@/components/admin/feedback/FeedbackStatusBadge";
import {
  ALL_FEEDBACK_TYPES,
  formatFeedbackCode,
  getFeedbackPriorityLabel,
  getFeedbackStatusLabel,
  getFeedbackTypeLabel
} from "@/lib/feedback/constants";
import {
  assignFeedbackToMeAction,
  loadAdminFeedbackDetailAction,
  quickFeedbackStatusAction,
  saveFeedbackInternalNoteAction,
  sendFeedbackReplyAction,
  updateFeedbackCategoryAction,
  updateFeedbackPriorityAction
} from "@/lib/admin/feedback-actions";
import { Button, Textarea } from "@/components/ui";
import type { FeedbackAdminCapabilities } from "@/types/admin-feedback";
import type {
  AdminFeedbackDetail,
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType
} from "@/types/contact-settings";

type Props = {
  feedbackId: string | null;
  capabilities: FeedbackAdminCapabilities;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function FeedbackDetailPanel({
  feedbackId,
  capabilities,
  open,
  onClose,
  onUpdated
}: Props) {
  const [detail, setDetail] = useState<
    (AdminFeedbackDetail & {
      attachments?: { file_url: string }[];
      user_avatar_url?: string | null;
      user_feedback_count_24h?: number;
    }) | null
  >(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [internalNote, setInternalNote] = useState("");
  const [reply, setReply] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !feedbackId) {
      setDetail(null);
      return;
    }
    startTransition(async () => {
      setLoadError(null);
      const result = await loadAdminFeedbackDetailAction(feedbackId);
      if (result.error) {
        setLoadError(result.error);
        setDetail(null);
        return;
      }
      setDetail(result.detail);
      setInternalNote(result.detail?.internal_note ?? "");
      setReply(result.detail?.admin_reply ?? "");
    });
  }, [open, feedbackId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  function runAction(fn: () => Promise<{ ok: boolean; message: string | null }>) {
    startTransition(async () => {
      const result = await fn();
      setToast(result.message);
      if (result.ok) {
        onUpdated?.();
        if (feedbackId) {
          const refreshed = await loadAdminFeedbackDetailAction(feedbackId);
          setDetail(refreshed.detail);
        }
      }
    });
  }

  if (!open) return null;

  const panel = (
    <div className="flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-zinc-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-bold text-white">Chi tiết feedback</h2>
        <Button onClick={onClose} type="button" variant="secondary">
          Đóng
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {pending && !detail ? (
          <p className="text-sm text-zinc-500">Đang tải…</p>
        ) : loadError || !detail ? (
          <p className="text-sm text-rose-300">{loadError ?? "Không tìm thấy."}</p>
        ) : (
          <div className="space-y-4">
            {toast ? (
              <p className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
                {toast}
              </p>
            ) : null}

            {(detail as { user_feedback_count_24h?: number }).user_feedback_count_24h &&
            (detail as { user_feedback_count_24h?: number }).user_feedback_count_24h! > 3 ? (
              <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Cảnh báo: người dùng đã gửi{" "}
                {(detail as { user_feedback_count_24h?: number }).user_feedback_count_24h} feedback
                trong 24h.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-cyan-200">
                {formatFeedbackCode(detail.code, detail.id)}
              </span>
              <FeedbackStatusBadge status={detail.status} />
              <FeedbackPriorityBadge priority={detail.priority} />
              <button
                className="text-xs text-zinc-400 hover:text-cyan-300"
                onClick={() => navigator.clipboard.writeText(formatFeedbackCode(detail.code, detail.id))}
                type="button"
              >
                Sao chép mã
              </button>
            </div>

            <p className="text-xs text-zinc-500">{getFeedbackTypeLabel(detail.category)}</p>

            <section className="rounded-xl border border-white/10 p-3">
              <div className="flex items-center gap-3">
                {detail.user_avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                    src={detail.user_avatar_url}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm text-white">
                    {(detail.user_display_name?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">
                    {detail.user_display_name || detail.user_username || "Khách"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    @{detail.user_username ?? "—"}
                    {detail.contact_email ? ` · ${detail.contact_email}` : ""}
                  </p>
                  {detail.user_id ? (
                    <p className="text-xs text-zinc-600">
                      ID: {detail.user_id.slice(0, 8)}…{" "}
                      <Link className="text-cyan-300 hover:underline" href={`/admin/users`}>
                        Mở hồ sơ
                      </Link>
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-zinc-300">Nội dung</h3>
              {detail.title ? (
                <p className="mt-1 font-medium text-white">{detail.title}</p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                {detail.message}
              </p>
            </section>

            {detail.screenshot_url || (detail.attachments?.length ?? 0) > 0 ? (
              <section>
                <h3 className="text-sm font-semibold text-zinc-300">Ảnh đính kèm</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.screenshot_url ? (
                    <a href={detail.screenshot_url} rel="noopener noreferrer" target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Screenshot"
                        className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                        src={detail.screenshot_url}
                      />
                    </a>
                  ) : null}
                  {detail.attachments?.map((a, i) => (
                    <a href={a.file_url} key={i} rel="noopener noreferrer" target="_blank">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Attachment"
                        className="h-20 w-20 rounded-lg border border-white/10 object-cover"
                        src={a.file_url}
                      />
                    </a>
                  ))}
                </div>
              </section>
            ) : null}

            {(detail.related_url || detail.user_agent || detail.device_info) && (
              <section className="text-sm">
                <h3 className="font-semibold text-zinc-300">Thông tin kỹ thuật</h3>
                {detail.related_url ? (
                  <p className="mt-1 break-all text-xs text-zinc-400">{detail.related_url}</p>
                ) : null}
                {detail.user_agent ? (
                  <p className="mt-1 break-all text-xs text-zinc-500">{detail.user_agent}</p>
                ) : null}
              </section>
            )}

            {detail.related_entity_type ? (
              <section className="text-sm text-zinc-400">
                Liên quan: {detail.related_entity_type} · {detail.related_entity_id?.slice(0, 8)}
              </section>
            ) : null}

            {capabilities.canUpdateStatus ? (
              <section className="space-y-3 border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-zinc-300">Thao tác nhanh</h3>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={pending}
                    onClick={() =>
                      runAction(() => quickFeedbackStatusAction(detail.id, "reviewing"))
                    }
                    type="button"
                    variant="secondary"
                  >
                    Đang xử lý
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      runAction(() => quickFeedbackStatusAction(detail.id, "need_more_info"))
                    }
                    type="button"
                    variant="secondary"
                  >
                    Cần thêm TT
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => runAction(() => quickFeedbackStatusAction(detail.id, "resolved"))}
                    type="button"
                    variant="secondary"
                  >
                    Đã xử lý
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => runAction(() => quickFeedbackStatusAction(detail.id, "closed"))}
                    type="button"
                    variant="secondary"
                  >
                    Đóng
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() => runAction(() => quickFeedbackStatusAction(detail.id, "rejected"))}
                    type="button"
                    variant="danger"
                  >
                    Không hợp lệ
                  </Button>
                  {capabilities.canAssign ? (
                    <Button
                      disabled={pending}
                      onClick={() => runAction(() => assignFeedbackToMeAction(detail.id))}
                      type="button"
                      variant="ghost"
                    >
                      Gán cho tôi
                    </Button>
                  ) : null}
                </div>

                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-400">Đổi priority</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                    onChange={(e) =>
                      runAction(() =>
                        updateFeedbackPriorityAction(detail.id, e.target.value as FeedbackPriority)
                      )
                    }
                    value={detail.priority ?? "normal"}
                  >
                    {(["low", "normal", "high", "urgent"] as FeedbackPriority[]).map((p) => (
                      <option key={p} value={p}>
                        {getFeedbackPriorityLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-400">Đổi loại</span>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-white"
                    onChange={(e) =>
                      runAction(() =>
                        updateFeedbackCategoryAction(detail.id, e.target.value as FeedbackType)
                      )
                    }
                    value={detail.category}
                  >
                    {ALL_FEEDBACK_TYPES.filter((t, i, a) => a.indexOf(t) === i).map((t) => (
                      <option key={t} value={t}>
                        {getFeedbackTypeLabel(t)}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
            ) : null}

            {capabilities.canUpdateStatus ? (
              <section className="space-y-2 border-t border-white/10 pt-4">
                <Textarea
                  label="Ghi chú nội bộ"
                  onChange={(e) => setInternalNote(e.target.value)}
                  rows={3}
                  value={internalNote}
                />
                <Button
                  disabled={pending}
                  onClick={() =>
                    runAction(() => saveFeedbackInternalNoteAction(detail.id, internalNote))
                  }
                  type="button"
                  variant="secondary"
                >
                  Lưu ghi chú
                </Button>
              </section>
            ) : null}

            {capabilities.canReply ? (
              <section className="space-y-2 border-t border-white/10 pt-4">
                <Textarea
                  label="Phản hồi người dùng"
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  value={reply}
                />
                <Button
                  disabled={pending || !reply.trim()}
                  onClick={() => runAction(() => sendFeedbackReplyAction(detail.id, reply))}
                  type="button"
                >
                  Gửi phản hồi
                </Button>
              </section>
            ) : null}

            <section className="border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-zinc-300">Lịch sử xử lý</h3>
              {detail.events.length === 0 ? (
                <p className="mt-2 text-xs text-zinc-500">Chưa có sự kiện.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.events.map((event) => (
                    <li
                      className="rounded-lg border border-white/10 bg-zinc-950/50 px-3 py-2 text-xs text-zinc-400"
                      key={event.id}
                    >
                      <p className="font-medium text-zinc-300">{event.event_type}</p>
                      {event.old_status && event.new_status ? (
                        <p>
                          {getFeedbackStatusLabel(event.old_status)} →{" "}
                          {getFeedbackStatusLabel(event.new_status)}
                        </p>
                      ) : null}
                      {event.note ? <p className="mt-1 text-zinc-500">{event.note}</p> : null}
                      <p className="mt-1 text-zinc-600">
                        {(event as { admin_label?: string }).admin_label ?? "—"} ·{" "}
                        {new Date(event.created_at).toLocaleString("vi-VN")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 lg:bg-black/40"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl">{panel}</div>
    </>
  );
}
